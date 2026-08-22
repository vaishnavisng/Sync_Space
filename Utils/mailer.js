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
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      lookup: forceIPv4Lookup,
      connectionTimeout: 6000,
      greetingTimeout: 6000,
      socketTimeout: 8000,
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

  // Enforce a strict 7-second timeout on SMTP sendMail so server response doesn't hang
  const sendPromise = getTransporter().sendMail({
    from: `"SyncSpace" <${user}>`,
    to: toEmail,
    subject: "Your SyncSpace verification code",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("SMTP email connection timed out after 7 seconds.")), 7000)
  );

  try {
    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`[MAILER SUCCESS] OTP email sent to ${toEmail}`);
  } catch (err) {
    console.error(`[MAILER ERROR] Primary SMTP failed for ${toEmail}:`, err.message);
    // Print OTP in logs as safety fallback so account creation & verification is never stuck
    console.log(`\n==================================================`);
    console.log(`[SERVER OTP SAFETY FALLBACK]`);
    console.log(`To: ${toEmail}`);
    console.log(`OTP Code: ${otp}`);
    console.log(`SMTP Error: ${err.message}`);
    console.log(`==================================================\n`);

    // If environment requires strict SMTP, throw error, otherwise allow OTP creation to proceed
    if (process.env.STRICT_MAIL_ERRORS === "true") {
      throw err;
    }
  }
}

module.exports = { sendOtpEmail };