const Y = require("yjs");
const SessionUpdate = require("../models/SessionUpdate");

const FLUSH_INTERVAL_MS = 2500;
const pending = new Map(); // roomId -> Uint8Array[]
const timers = new Map();

function bufferUpdate(roomId, update) {
  const list = pending.get(roomId) || [];
  list.push(update);
  pending.set(roomId, list);

  if (!timers.has(roomId)) {
    const t = setTimeout(() => flush(roomId), FLUSH_INTERVAL_MS);
    t.unref?.();
    timers.set(roomId, t);
  }
}

async function flush(roomId) {
  timers.delete(roomId);
  const list = pending.get(roomId);
  pending.delete(roomId);
  if (!list || list.length === 0) return;

  try {
    const merged = Y.mergeUpdates(list);
    await SessionUpdate.create({ roomId, update: Buffer.from(merged), timestamp: new Date() });
  } catch (err) {
    console.error(`Failed to log replay snapshot for room ${roomId}:`, err.message);
  }
}

async function getHistory(roomId, limit = 300) {
  const docs = await SessionUpdate.find({ roomId }).sort({ timestamp: 1 }).limit(limit).lean();
  return docs.map((d) => ({ timestamp: d.timestamp.getTime(), update: d.update.toString("base64") }));
}

module.exports = { bufferUpdate, getHistory };