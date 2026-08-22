const Y = require("yjs");
const { getOrCreateRoom, getRoom } = require("./roomStore");
const { isValidRoomId } = require("./validators");

const RATE_LIMIT = 300;
const RATE_WINDOW_MS = 1000;

function withinRateLimit(socket) {
  const now = Date.now();
  if (!socket.data.rateWindowStart || now - socket.data.rateWindowStart > RATE_WINDOW_MS) {
    socket.data.rateWindowStart = now;
    socket.data.rateCount = 0;
  }
  socket.data.rateCount += 1;
  console.log(`[rateLimit] socket ${socket.id}, count: ${socket.data.rateCount}, windowAge: ${now - socket.data.rateWindowStart}ms`);
  return socket.data.rateCount <= RATE_LIMIT;
}

function yjsHandler(io, socket) {
  socket.on("room:join", async ({ roomId }) => {
    console.log(`[room:join] socket ${socket.id} joining room ${roomId}, valid: ${isValidRoomId(roomId)}`);
    if (!isValidRoomId(roomId)) return;
    const room = await getOrCreateRoom(roomId);
    socket.emit("yjs:sync", Buffer.from(Y.encodeStateAsUpdate(room.doc)));
  });

  socket.on("yjs:update", ({ roomId, update }) => {
    const rateOk = withinRateLimit(socket);
    console.log(`[yjs:update] from ${socket.id}, room: ${roomId}, valid: ${isValidRoomId(roomId)}, hasUpdate: ${!!update}, rateOk: ${rateOk}`);
    if (!isValidRoomId(roomId) || !update || !rateOk) return;
    const room = getRoom(roomId);
    console.log(`[yjs:update] room found: ${!!room}`);
    if (!room) return;

    try {
      Y.applyUpdate(room.doc, Buffer.from(update), socket.id);
    } catch (err) {
      console.error(`Rejected malformed Yjs update from ${socket.id}:`, err.message);
      return;
    }
    console.log(`[yjs:update] broadcasting to room ${roomId}, excluding sender ${socket.id}`);
    socket.to(roomId).emit("yjs:update", Buffer.from(update));
  });

  socket.on("awareness:update", ({ roomId, update }) => {
    if (!isValidRoomId(roomId) || !update || !getRoom(roomId) || !withinRateLimit(socket)) return;
    socket.to(roomId).emit("awareness:update", Buffer.from(update));
  });
}

module.exports = yjsHandler;