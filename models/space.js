// models/Space.js
const mongoose = require('mongoose');

const SpaceSchema = new mongoose.Schema({
  spaceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  // Handles the Yjs CRDT raw update binary buffers natively
  documentState: {
    type: Buffer,
    default: null
  },
  lastSavedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Space', SpaceSchema);