const Y = require("yjs");
const { loadState, saveState, startAutosave } = require("./persistence");

const rooms = new Map();
const loadingPromises = new Map();

const EMPTY_ROOM_TTL_MS = 5 * 60 * 1000;
const emptyRoomTimers = new Map();

startAutosave(rooms);

async function getOrCreateRoom(roomId) {
  clearEvictionTimer(roomId);
  let room = rooms.get(roomId);
  if (room) {
    const pending = loadingPromises.get(roomId);
    if (pending) await pending;
    return room;
  }

  const doc = new Y.Doc();
  room = { doc, users: new Map(), dirty: false, adminSocketId: null, pending: new Map() };
  rooms.set(roomId, room);

  const loadPromise = (async () => {
    const persisted = await loadState(roomId);
    if (persisted) {
      try {
        Y.applyUpdate(doc, Buffer.isBuffer(persisted) ? persisted : Buffer.from(persisted));
      } catch (err) {
        // A corrupted/incompatible saved document must never crash the
        // server — worst case, that room starts empty instead of restored.
        console.error(`Corrupted persisted state for room "${roomId}", starting fresh:`, err.message);
      }
    }
    const { bufferUpdate } = require("./replayLogger");
    doc.on("update", (update) => {
      room.dirty = true;
      bufferUpdate(roomId, update);
    });
  })();
  loadingPromises.set(roomId, loadPromise);
  await loadPromise;
  loadingPromises.delete(roomId);

  return room;
}

function getRoom(roomId) {
  return rooms.get(roomId) || null;
}

function roomExists(roomId) {
  return rooms.has(roomId);
}

function clearEvictionTimer(roomId) {
  const timer = emptyRoomTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    emptyRoomTimers.delete(roomId);
  }
}

function scheduleEvictionIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (!room || room.users.size > 0) return;

  clearEvictionTimer(roomId);
  const timer = setTimeout(async () => {
    const current = rooms.get(roomId);
    if (current && current.users.size === 0) {
      if (current.dirty) await saveState(roomId, current.doc);
      current.doc.destroy();
      rooms.delete(roomId);
    }
    emptyRoomTimers.delete(roomId);
  }, EMPTY_ROOM_TTL_MS);
  emptyRoomTimers.set(roomId, timer);
}

function listUsers(roomId) {
  const room = rooms.get(roomId);
  if (!room) return [];
  return Array.from(room.users.entries()).map(([socketId, info]) => ({
    socketId,
    ...info,
    isAdmin: socketId === room.adminSocketId,
  }));
}

module.exports = { rooms, getOrCreateRoom, getRoom, roomExists, scheduleEvictionIfEmpty, listUsers };