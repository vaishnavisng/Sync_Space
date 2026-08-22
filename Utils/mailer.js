const dns = require("dns");
const nodemailer = require("nodemailer");

dns.setDefaultResultOrder("ipv4first");

function isPlaceholderCredential(val) {
  if (!val || typeof val !== "string") return true;
  const lower = val.trim().toLowerCase();
  return (
    lower === "" ||
    lower.includes("your_gmail") ||
    lower.includes("example.com") ||
    lower.includes("your_") ||
    lower.includes("placeholder")
  );
}

let transporter = null;

function getTransporter() {
  if (!transporter) {
    const cleanPass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      family: 4,
      secure: false,
      requireTLS: true,
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 5000,
      auth: {
        user: process.env.EMAIL_USER?.trim(),
        pass: cleanPass,
      },
    });
  }
  return transporter;
}

async function sendOtpEmail(toEmail, otp) {
  const user = process.env.EMAIL_USER?.trim();
  const pass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");

  // Fallback for unconfigured or placeholder credentials in local/dev setup
  if (isPlaceholderCredential(user) || isPlaceholderCredential(pass)) {
    console.log(`\n==================================================`);
    console.log(`[DEV OTP NOTIFICATION]`);
    console.log(`To: ${toEmail}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Reason: EMAIL_USER/EMAIL_PASS not configured in .env`);
    console.log(`==================================================\n`);
    return;
  }

  // Enforce a strict 5-second timeout on SMTP sendMail so server response doesn't hang
  const sendPromise = getTransporter().sendMail({
    from: `"SyncSpace" <${user}>`,
    to: toEmail,
    subject: "Your SyncSpace verification code",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("SMTP email connection timed out after 5 seconds.")), 5000)
  );

  try {
    await Promise.race([sendPromise, timeoutPromise]);
  } catch (err) {
    console.error(`[MAILER ERROR] Failed to send email to ${toEmail}:`, err.message);
    if (process.env.NODE_ENV !== "production") {
      console.log(`\n==================================================`);
      console.log(`[FALLBACK DEV OTP]`);
      console.log(`To: ${toEmail}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`==================================================\n`);
      return;
    }
    throw err;
  }
}

module.exports = { sendOtpEmail };