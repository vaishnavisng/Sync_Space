const { getOrCreateRoom, getRoom } = require("./roomStore");
const { isValidRoomId, sanitizeUsername } = require("./validators");

function joinRequestHandler(io, socket) {
  socket.on("room:request-join", async ({ roomId, username }) => {
    if (!isValidRoomId(roomId)) {
      socket.emit("room:error", { message: "Invalid room ID." });
      return;
    }
    const cleanUsername = sanitizeUsername(username);
    const room = await getOrCreateRoom(roomId);

    // Nobody to ask — first person into an empty room just gets in
    // (matches roomHandler.js's own rule for who becomes admin).
    if (!room.adminSocketId) {
      socket.emit("room:join-approved");
      return;
    }

    room.pending.set(socket.id, { username: cleanUsername, socketId: socket.id });
    io.to(room.adminSocketId).emit("room:incoming-join-request", { requesterId: socket.id, username: cleanUsername });
  });

  socket.on("room:approve-join", ({ roomId, requesterId }) => {
    const room = getRoom(roomId);
    if (!room || room.adminSocketId !== socket.id) return; // only the actual admin may approve
    if (!room.pending.has(requesterId)) return;
    room.pending.delete(requesterId);
    io.to(requesterId).emit("room:join-approved");
  });

  socket.on("room:deny-join", ({ roomId, requesterId }) => {
    const room = getRoom(roomId);
    if (!room || room.adminSocketId !== socket.id) return;
    if (!room.pending.has(requesterId)) return;
    room.pending.delete(requesterId);
    io.to(requesterId).emit("room:join-denied");
  });

  socket.on("disconnect", () => {
    const { rooms } = require("./roomStore");
    for (const room of rooms.values()) {
      room.pending.delete(socket.id);
    }
  });
}

module.exports = joinRequestHandler;