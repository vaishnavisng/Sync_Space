const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendOtpEmail(toEmail, otp) {
  await transporter.sendMail({
    from: `"SyncSpace" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Your SyncSpace verification code",
    text: `Your OTP is ${otp}. It expires in 10 minutes.`,
  });
}

module.exports = { sendOtpEmail };