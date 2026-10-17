const mongoose = require("mongoose");

// Disable buffering so queries immediately fail-fast to the resilient in-memory fallback store
// instead of hanging for 10,000ms.
mongoose.set("bufferCommands", false);

let isConnected = false;
let reconnectTimer = null;

async function attemptConnect(uri) {
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    isConnected = true;
    console.log("[DB] MongoDB connected successfully.");
    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }
  } catch (err) {
    isConnected = false;
    console.warn("[DB] MongoDB connection failed:", err.message);
    console.warn("[DB] Running with in-memory resilient fallback store. App will stay 100% operational.");
  }
}

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[DB] MONGODB_URI not configured. Operating with in-memory persistent fallback store.");
    return;
  }

  await attemptConnect(uri);

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("[DB] MongoDB disconnected. Re-engaging fallback store.");
    if (!reconnectTimer && process.env.MONGODB_URI) {
      reconnectTimer = setInterval(() => {
        if (mongoose.connection.readyState !== 1) {
          attemptConnect(process.env.MONGODB_URI);
        }
      }, 20000);
      reconnectTimer.unref?.();
    }
  });

  mongoose.connection.on("connected", () => {
    isConnected = true;
    console.log("[DB] MongoDB reconnected.");
  });

  // If initial connection was unsuccessful, start background reconnect attempts
  if (mongoose.connection.readyState !== 1 && !reconnectTimer) {
    reconnectTimer = setInterval(() => {
      if (mongoose.connection.readyState !== 1) {
        attemptConnect(process.env.MONGODB_URI);
      }
    }, 20000);
    reconnectTimer.unref?.();
  }
}

function isDbConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = connectDB;
module.exports.isDbConnected = isDbConnected;