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

// Resolve smtp.gmail.com to IPv4 to bypass cloud container IPv6 ENETUNREACH errors
async function createIPv4Transporter() {
  const user = process.env.EMAIL_USER?.trim();
  const pass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");

  let targetHost = "smtp.gmail.com";
  try {
    const ips = await dns.promises.resolve4("smtp.gmail.com");
    if (ips && ips.length > 0) {
      targetHost = ips[0]; // Connect directly to IPv4 address (e.g. 74.125.x.x)
    }
  } catch (dnsErr) {
    console.warn("[MAILER DNS] resolve4 fallback to hostname:", dnsErr.message);
  }

  return nodemailer.createTransport({
    host: targetHost,
    port: 465,
    secure: true,
    tls: {
      servername: "smtp.gmail.com",
      rejectUnauthorized: false,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 12000,
    auth: {
      user: user,
      pass: pass,
    },
  });
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
    return { delivered: false, devOtp: otp };
  }

  try {
    const transporter = await createIPv4Transporter();
    const info = await transporter.sendMail({
      from: `"SyncSpace" <${user}>`,
      to: toEmail,
      subject: "Your SyncSpace verification code",
      text: `Your OTP is ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 480px; margin: 0 auto; border: 1px solid #e2e8f0; rounded: 8px;">
          <h2 style="color: #4F46E5; margin-bottom: 8px;">SyncSpace Verification</h2>
          <p style="color: #475569; font-size: 14px;">Use the following 6-digit code to complete your verification:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #4F46E5; padding: 16px 0; text-align: center; background: #f8fafc; border-radius: 6px; margin: 16px 0;">
            ${otp}
          </div>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });
    console.log(`[MAILER SUCCESS] OTP email sent to ${toEmail}. Message ID: ${info.messageId}`);
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[MAILER ERROR] Failed to send email to ${toEmail}:`, err.message);
    console.log(`\n==================================================`);
    console.log(`[SERVER OTP SAFETY FALLBACK]`);
    console.log(`To: ${toEmail}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`Error details: ${err.message}`);
    console.log(`==================================================\n`);
    return { delivered: false, error: err.message, fallbackOtp: otp };
  }
}

module.exports = { sendOtpEmail };