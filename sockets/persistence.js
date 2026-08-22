const Y = require("yjs");
const Space = require("../models/Space");

const AUTOSAVE_INTERVAL_MS = 15000;
let autosaveTimer = null;

async function loadState(roomId) {
  try {
    const record = await Space.findOne({ spaceId: roomId }).lean();
    const state = record ? record.documentState : null;
    console.log(`[loadState] room ${roomId}, found: ${!!state}, bytes: ${state ? state.length : 0}`);
    return state;
  } catch (err) {
    console.error(`Failed to load persisted state for room ${roomId}:`, err.message);
    return null;
  }
}

async function saveState(roomId, doc) {
  try {
    const state = Buffer.from(Y.encodeStateAsUpdate(doc));
    console.log(`[saveState] room ${roomId}, bytes: ${state.length}`);
    await Space.updateOne(
      { spaceId: roomId },
      { $set: { documentState: state, lastSavedAt: new Date() } },
      { upsert: true }
    );
  } catch (err) {
    console.error(`Failed to persist room ${roomId}:`, err.message);
  }
}

function startAutosave(rooms) {
  if (autosaveTimer) return;
  autosaveTimer = setInterval(async () => {
    for (const [roomId, room] of rooms.entries()) {
      if (room.dirty) {
        room.dirty = false;
        await saveState(roomId, room.doc);
      }
    }
  }, AUTOSAVE_INTERVAL_MS);
  autosaveTimer.unref?.();
}

function stopAutosave() {
  clearInterval(autosaveTimer);
  autosaveTimer = null;
}

async function flushAll(rooms) {
  const saves = [];
  for (const [roomId, room] of rooms.entries()) {
    if (room.dirty) {
      room.dirty = false;
      saves.push(saveState(roomId, room.doc));
    }
  }
  await Promise.all(saves);
}

module.exports = { loadState, saveState, startAutosave, stopAutosave, flushAll };