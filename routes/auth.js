const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const { sendOtpEmail } = require("../Utils/mailer");

const router = express.Router();

const OTP_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

function generateOtp() {
  return crypto.randomInt(100000, 999999).toString();
}

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
    if (!user) return res.status(404).json({ error: "No account found with that username or email" });
    if (!user.isVerified) return res.status(403).json({ error: "Please verify your email first", email: user.email });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: "Server error during login" });
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
        // Ensure the chosen username isn't already taken by another account
        if (existing.username !== username) {
          const usernameTaken = await User.findOne({ username, _id: { $ne: existing._id } });
          if (usernameTaken) {
            return res.status(409).json({ error: "Username already in use" });
          }
        }

        const existingOtp = generateOtp();
        try {
          await sendOtpEmail(email, existingOtp);
        } catch (mailError) {
          console.error("Signup email error:", mailError.message);
          return res.status(502).json({ error: "Unable to send verification email. Check the email service configuration." });
        }
        existing.username = username;
        existing.password = await bcrypt.hash(password, 10);
        existing.otp = existingOtp;
        existing.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
        await existing.save();
        return res.status(200).json({ message: "OTP sent to email", email });
      }
      return res.status(409).json({ error: "Username or email already in use" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = generateOtp();
    const otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);

    try {
      await sendOtpEmail(email, otp);
    } catch (mailError) {
      console.error("Signup email error:", mailError.message);
      return res.status(502).json({ error: "Unable to send verification email. Check the email service configuration." });
    }

    await User.create({
      username, email, password: hashedPassword,
      otp, otpExpiresAt, isVerified: false,
    });

    res.status(201).json({ message: "OTP sent to email", email });
  } catch (err) {
    console.error("Signup error:", err.message);
    res.status(500).json({ error: "Server error during signup" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    const otp = req.body?.otp?.trim();
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isVerified) return res.status(400).json({ error: "Already verified" });
    if (user.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
    if (user.otpExpiresAt < new Date()) return res.status(400).json({ error: "OTP expired" });

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, username: user.username });
  } catch (err) {
    console.error("OTP verification error:", err.message);
    res.status(500).json({ error: "Server error during verification" });
  }
});

router.post("/resend-otp", async (req, res) => {
  try {
    const email = req.body?.email?.trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "Email is required" });
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: "User not found" });
    if (user.isVerified) return res.status(400).json({ error: "Already verified" });

    const otp = generateOtp();
    user.otp = otp;
    user.otpExpiresAt = new Date(Date.now() + OTP_TTL_MS);
    await user.save();

    await sendOtpEmail(email, otp);
    res.json({ message: "OTP resent" });
  } catch (err) {
    console.error("Resend OTP error:", err.message);
    res.status(500).json({ error: "Server error resending OTP" });
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

    await sendOtpEmail(email, otp);
    res.json({ message: "Reset code sent to email" });
  } catch (err) {
    console.error("Forgot password error:", err.message);
    res.status(500).json({ error: "Server error" });
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
    if (user.otp !== otp) return res.status(400).json({ error: "Invalid code" });
    if (user.otpExpiresAt < new Date()) return res.status(400).json({ error: "Code expired" });

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err.message);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;