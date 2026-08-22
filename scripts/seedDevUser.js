require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

async function main() {
  const isProd = process.env.NODE_ENV === "production";
  const allowInProd = process.env.ALLOW_DEV_SEED === "true";

  if (isProd && !allowInProd) {
    console.error(
      "Refusing to seed a dev account: NODE_ENV=production and ALLOW_DEV_SEED is not 'true'.\n" +
      "This script is for local/dev use only."
    );
    process.exit(1);
  }

  const { DEV_USER_USERNAME, DEV_USER_EMAIL, DEV_USER_PASSWORD, MONGODB_URI } = process.env;
  if (!DEV_USER_USERNAME || !DEV_USER_EMAIL || !DEV_USER_PASSWORD) {
    console.error("Set DEV_USER_USERNAME, DEV_USER_EMAIL, and DEV_USER_PASSWORD in .env before running this.");
    process.exit(1);
  }
  if (!MONGODB_URI) {
    console.error("MONGODB_URI is not set — nothing to connect to.");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const hashedPassword = await bcrypt.hash(DEV_USER_PASSWORD, 10);

  const user = await User.findOneAndUpdate(
    { email: DEV_USER_EMAIL },
    {
      username: DEV_USER_USERNAME,
      email: DEV_USER_EMAIL,
      password: hashedPassword,
      isVerified: true, // born verified — this is the entire "bypass," no OTP step needed
      otp: undefined,
      otpExpiresAt: undefined,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Dev account ready: ${user.username} <${user.email}> (isVerified: ${user.isVerified})`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});