const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
const UserModel = require("./User");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORE_FILE = path.join(DATA_DIR, "users-store.json");

// In-memory user cache
const memoryUsers = new Map(); // id -> user object
const usernameIndex = new Map(); // lowercase username -> id
const emailIndex = new Map(); // lowercase email -> id

function generateHexId() {
  return crypto.randomBytes(12).toString("hex"); // 24-hex char MongoDB-compatible ObjectId
}

// Safely load persisted memory users from disk if available
function initStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, "utf-8");
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        for (const item of list) {
          const userObj = createMemoryUser(item);
          indexUser(userObj);
        }
        console.log(`[AUTH STORE] Loaded ${memoryUsers.size} users from local backup store.`);
      }
    }
  } catch (err) {
    console.warn("[AUTH STORE] Could not initialize local user store backup:", err.message);
  }
}

function persistStore() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(memoryUsers.values()).map((u) => u.toObject());
    fs.writeFileSync(STORE_FILE, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    // Non-fatal if filesystem is read-only
  }
}

function indexUser(user) {
  memoryUsers.set(String(user._id), user);
  if (user.username) usernameIndex.set(user.username.toLowerCase(), String(user._id));
  if (user.email) emailIndex.set(user.email.toLowerCase(), String(user._id));
}

function createMemoryUser(data) {
  const id = data._id ? String(data._id) : generateHexId();
  const obj = {
    _id: id,
    id: id,
    username: data.username || "",
    email: (data.email || "").toLowerCase(),
    password: data.password || "",
    isVerified: Boolean(data.isVerified),
    otp: data.otp || undefined,
    otpExpiresAt: data.otpExpiresAt ? new Date(data.otpExpiresAt) : undefined,
    createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
  };

  obj.toObject = function () {
    return { ...this };
  };

  obj.toJSON = function () {
    return { ...this };
  };

  obj.save = async function () {
    this.updatedAt = new Date();
    indexUser(this);
    persistStore();

    // If MongoDB is connected, also mirror save to MongoDB
    if (mongoose.connection.readyState === 1) {
      try {
        await UserModel.updateOne(
          { $or: [{ _id: this._id }, { email: this.email }, { username: this.username }] },
          {
            $set: {
              username: this.username,
              email: this.email,
              password: this.password,
              isVerified: this.isVerified,
              otp: this.otp,
              otpExpiresAt: this.otpExpiresAt,
            },
          },
          { upsert: true }
        );
      } catch (err) {
        console.warn("[AUTH STORE] Mirroring save to MongoDB failed:", err.message);
      }
    }
    return this;
  };

  return obj;
}

initStore();

function isDbReady() {
  return mongoose.connection.readyState === 1;
}

function matchesQuery(user, query) {
  if (!user || !query) return false;

  // Handle $or: [{ username }, { email }]
  if (Array.isArray(query.$or)) {
    return query.$or.some((subQuery) => matchesQuery(user, subQuery));
  }

  // Handle _id: { $ne: val }
  if (query._id && typeof query._id === "object" && "$ne" in query._id) {
    if (String(user._id) === String(query._id.$ne)) {
      return false;
    }
  } else if (query._id && String(user._id) !== String(query._id)) {
    return false;
  }

  if (query.username && user.username.toLowerCase() !== String(query.username).toLowerCase()) {
    return false;
  }

  if (query.email && user.email.toLowerCase() !== String(query.email).toLowerCase()) {
    return false;
  }

  return true;
}

const userRepository = {
  async findOne(query) {
    // 1. If MongoDB is connected, try MongoDB first with a short timeout
    if (isDbReady()) {
      try {
        const doc = await UserModel.findOne(query).maxTimeMS(3000).exec();
        if (doc) {
          // Keep memory store updated with MongoDB doc
          const mem = createMemoryUser(doc);
          indexUser(mem);
          return doc;
        }
      } catch (err) {
        console.warn("[AUTH STORE] MongoDB findOne failed, falling back to in-memory store:", err.message);
      }
    }

    // 2. Fall back to memory store
    // Fast path: direct lookup by email
    if (query.email && typeof query.email === "string" && !query.$or && !query._id) {
      const id = emailIndex.get(query.email.toLowerCase());
      if (id && memoryUsers.has(id)) {
        return memoryUsers.get(id);
      }
    }

    // Fast path: direct lookup by username
    if (query.username && typeof query.username === "string" && !query.$or && !query._id) {
      const id = usernameIndex.get(query.username.toLowerCase());
      if (id && memoryUsers.has(id)) {
        return memoryUsers.get(id);
      }
    }

    // General search across memory users
    for (const user of memoryUsers.values()) {
      if (matchesQuery(user, query)) {
        return user;
      }
    }

    return null;
  },

  async findById(id) {
    if (isDbReady()) {
      try {
        const doc = await UserModel.findById(id).maxTimeMS(3000).exec();
        if (doc) return doc;
      } catch (err) {
        console.warn("[AUTH STORE] MongoDB findById failed, falling back to memory store:", err.message);
      }
    }
    return memoryUsers.get(String(id)) || null;
  },

  async create(data) {
    const memUser = createMemoryUser(data);
    indexUser(memUser);
    persistStore();

    if (isDbReady()) {
      try {
        const doc = await UserModel.create({
          username: memUser.username,
          email: memUser.email,
          password: memUser.password,
          isVerified: memUser.isVerified,
          otp: memUser.otp,
          otpExpiresAt: memUser.otpExpiresAt,
        });
        return doc;
      } catch (err) {
        console.warn("[AUTH STORE] MongoDB create failed, using in-memory user:", err.message);
      }
    }

    return memUser;
  },

  // Expose underlying model and stats
  UserModel,
  getStatus() {
    return {
      dbConnected: isDbReady(),
      memoryUsersCount: memoryUsers.size,
    };
  },
};

module.exports = userRepository;
