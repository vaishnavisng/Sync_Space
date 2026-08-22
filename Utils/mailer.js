const dns = require("dns");
const nodemailer = require("nodemailer");

dns.setDefaultResultOrder("ipv4first");

function forceIPv4Lookup(hostname, options, callback) {
  return dns.lookup(hostname, { family: 4 }, callback);
}

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
      service: "gmail",
      lookup: forceIPv4Lookup,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
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

  try {
    const info = await getTransporter().sendMail({
      from: `"SyncSpace" <${user}>`,
      to: toEmail,
      subject: "Your SyncSpace verification code",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #4F46E5;">SyncSpace Verification Code</h2>
          <p>Your 6-digit OTP code is:</p>
          <div style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #4F46E5; padding: 10px 0;">
            ${otp}
          </div>
          <p>This code expires in 10 minutes.</p>
        </div>
      `,
    });
    console.log(`[MAILER SUCCESS] OTP email sent to ${toEmail}. Message ID: ${info.messageId}`);
  } catch (err) {
    console.error(`[MAILER ERROR] Failed to send email to ${toEmail}:`, err.message);
    console.log(`\n==================================================`);
    console.log(`[SERVER OTP SAFETY FALLBACK]`);
    console.log(`To: ${toEmail}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Error: ${err.message}`);
    console.log(`==================================================\n`);
    throw new Error(`Email delivery failed: ${err.message}`);
  }
}

module.exports = { sendOtpEmail };