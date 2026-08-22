const mongoose = require("mongoose");

const sessionUpdateSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  update: { type: Buffer, required: true },
  timestamp: { type: Date, default: Date.now, index: true },
});

module.exports = mongoose.model("SessionUpdate", sessionUpdateSchema);