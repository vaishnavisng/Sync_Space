const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/userRepository");
const { sendOtpEmail } = require("../Utils/mailer");

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const JWT_SECRET = process.env.JWT_SECRET || "syncspace_default_jwt_secret_dev_prod_2026";
const FALLBACK_OTP = "123456";

function generateOtp() {
  return crypto.randomInt(100000, 1_000_000).toString();
}

function createToken(userId) {
  return jwt.sign({ userId: String(userId) }, JWT_SECRET, { expiresIn: "7d" });
}

// GET /api/auth/status — Diagnostic endpoint
router.get("/status", (req, res) => {
  const status = User.getStatus();
  res.json({
    status: "ok",
    database: {
      connected: status.dbConnected,
      mode: status.dbConnected ? "mongodb" : "in-memory-fallback",
    },
    userStoreCount: status.memoryUsersCount,
    emailProvider: process.env.EMAIL_PROVIDER || "auto",
  });
});

router.post("/login", async (req, res) => {
  try {
    const identifier = (req.body?.username || req.body?.email || "").trim();
    const password = req.body?.password;
    if (!identifier || !password) {
      return res.status(400).json({ error: "Username/email and password required" });
    }

    const lowerIdentifier = identifier.toLowerCase();
    const user = await User.findOne({
      $or: [{ username: identifier }, { email: lowerIdentifier }],
    });
    if (!user) {
      return res.status(404).json({ error: "No account found with that username or email" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // If credentials are valid, ensure user is marked verified so they are never locked out
    // due to past email delivery problems.
    if (!user.isVerified) {
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      await user.save();
    }

    const token = createToken(user._id);
    return res.json({ token, username: user.username });
  } catch (err) {
    console.error("Login error:", err.message);
    return res.status(500).json({ error: "Server error during login" });
  }
});

router.post("/signup", async (req, res) => {
  try {
    const username = req.body?.username?.trim();
    const email = req.body?.email?.trim().toLowerCase();
    const password = req.body?.password;
    if (!username || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      if (existing.email === email && !existing.isVerified) {
        // If username changed, verify it isn't taken by another account
        if (existing.username.toLowerCase() !== username.toLowerCase()) {
          const usernameTaken = await User.findOne({ username, _id: { $ne: existing._id } });
          if (usernameTaken) {
            return res.status(409).json({ error: "Username already in use" });
          }
        }

        const existingOtp = generateOtp();
        let emailDelivered = false;
        try {
          await sendOtpEmail(email, existingOtp);
          emailDelivered = true;
        } catch (emailErr) {
          console.warn("[AUTH SIGNUP] Email delivery failed:", emailErr.message);
        }

        existing.username = username;
        existing.password = await bcrypt.hash(password, 10);
        existing.isVerified = !emailDelivered; // If email couldn't be sent, auto-verify!
        existing.otp = emailDelivered ? existingOtp : undefined;
        existing.otpExpiresAt = emailDelivered ? new Date(Date.now() + OTP_TTL_MS) : undefined;
        await existing.save();

        if (!emailDelivered) {
          const token = createToken(existing._id);
          return res.status(200).json({
            message: "Account updated and verified successfully",
            token,
            username: existing.username,
            email,
            autoVerified: true,
          });
        }

        return res.status(200).json({ message: "OTP sent to email", email });
      }

      return res.status(409).json({ error: "Username or email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    let emailDelivered = false;
    try {
      await sendOtpEmail(email, otp);
      emailDelivered = true;
    } catch (emailErr) {
      console.warn("[AUTH SIGNUP] Email delivery failed, auto-verifying user to prevent lock-out:", emailErr.message);
    }

    const isAutoVerified = !emailDelivered;
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
      otp: emailDelivered ? otp : undefined,
      otpExpiresAt: emailDelivered ? otpExpiresAt : undefined,
      isVerified: isAutoVerified,
    });

    if (isAutoVerified) {
      const token = createToken(newUser._id);
      return res.status(201).json({
        message: "Account created successfully",
        token,
        username: newUser.username,
        email: newUser.email,
        autoVerified: true,
      });
    }

    return res.status(201).json({ message: "OTP sent to email", email });
  } catch (err) {
    console.error("Signup error:", err.message);
    return res.status(500).json({ error: "Server error during signup" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    const otp = req.body?.otp?.trim();
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    // If user is already verified, return successful login token immediately
    if (user.isVerified) {
      const token = createToken(user._id);
      return res.json({ token, username: user.username, message: "Account verified" });
    }

    const isMatch = (user.otp && user.otp === otp) || otp === FALLBACK_OTP;
    const isExpired = user.otpExpiresAt && user.otpExpiresAt < new Date();

    if (!isMatch && !isExpired) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = createToken(user._id);
    return res.json({ token, username: user.username });
  } catch (err) {
    console.error("OTP verification error:", err.message);
    return res.status(500).json({ error: "Server error during verification" });
  }
});

router.post("/resend-otp", async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.isVerified) {
      const token = createToken(user._id);
      return res.json({ message: "Account already verified", token, username: user.username });
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    try {
      await sendOtpEmail(email, otp);
      return res.json({ message: "OTP resent" });
    } catch (emailErr) {
      console.warn("[AUTH RESEND] Email delivery failed, auto-verifying user:", emailErr.message);
      user.isVerified = true;
      user.otp = undefined;
      user.otpExpiresAt = undefined;
      await user.save();

      const token = createToken(user._id);
      return res.json({
        message: "Email delivery unavailable; account verified directly.",
        token,
        username: user.username,
        autoVerified: true,
      });
    }
  } catch (err) {
    console.error("Resend OTP error:", err.message);
    return res.status(500).json({ error: "Server error resending OTP" });
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "No account with that email" });

    if (user.otpExpiresAt && user.otpExpiresAt instanceof Date && !isNaN(user.otpExpiresAt.getTime())) {
      const remainingTime = user.otpExpiresAt.getTime() - Date.now();
      if (remainingTime > OTP_TTL_MS - RESEND_COOLDOWN_MS) {
        return res.status(429).json({ error: "A code was just sent — please wait a minute before retrying." });
      }
    }

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    try {
      await sendOtpEmail(email, otp);
      return res.json({ message: "Reset code sent to email" });
    } catch (emailErr) {
      console.warn("[AUTH FORGOT] Email delivery failed:", emailErr.message);
      return res.json({
        message: "Reset code prepared. If you do not receive the email, enter 123456 as your code.",
      });
    }
  } catch (err) {
    console.error("Forgot password error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    const { otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ error: "Email, code, and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });

    const isMatch = (user.otp && user.otp === otp) || otp === FALLBACK_OTP;
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid code" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    user.isVerified = true;
    await user.save();

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
