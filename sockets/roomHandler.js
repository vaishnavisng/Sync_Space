const { getOrCreateRoom, getRoom, listUsers, scheduleEvictionIfEmpty } = require("./roomStore");
const { isValidRoomId, sanitizeUsername } = require("./validators");

function roomHandler(io, socket) {
  socket.on("room:join", async ({ roomId, username }) => {
    if (!isValidRoomId(roomId)) {
      socket.emit("room:error", { message: "Invalid room ID." });
      return;
    }
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.username = sanitizeUsername(username);

    const room = await getOrCreateRoom(roomId);
    const isFirstUser = room.users.size === 0;
    if (isFirstUser) {
      room.adminSocketId = socket.id;
    }
    room.users.set(socket.id, { username: socket.data.username });

    socket.emit("room:users", listUsers(roomId));
    socket.to(roomId).emit("room:user-joined", {
      socketId: socket.id,
      username: socket.data.username,
      isAdmin: isFirstUser,
    });
  });

  socket.on("room:leave", () => leaveCurrentRoom(io, socket));
  socket.on("room:kick", ({ roomId, targetSocketId }) => {
    const room = getRoom(roomId);
    if (!room) return;

    // only the current admin may kick, and never themselves
    if (room.adminSocketId !== socket.id || targetSocketId === socket.id) return;

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket) return;

    room.users.delete(targetSocketId);
    targetSocket.emit("room:kicked");
    targetSocket.leave(roomId);
    targetSocket.data.roomId = null;

    io.to(roomId).emit("room:users", listUsers(roomId));
  });
  socket.on("disconnect", () => leaveCurrentRoom(io, socket));
}

function leaveCurrentRoom(io, socket) {
  const roomId = socket.data.roomId;
  if (!roomId) return;

  const room = getRoom(roomId);
  if (room) {
    room.users.delete(socket.id);

    // --- ADMIN HANDOFF & PENDING REQUEST TRANSFER ---
    if (room.adminSocketId === socket.id) {
      const nextAdmin = room.users.keys().next().value || null;
      room.adminSocketId = nextAdmin;

      // Let everyone still in the room know the fresh admin status.
      io.to(roomId).emit("room:users", listUsers(roomId));

      if (nextAdmin) {
        // Hand off anything the outgoing admin hadn't gotten to.
        for (const [requesterId, req] of room.pending.entries()) {
          io.to(nextAdmin).emit("room:incoming-join-request", {
            requesterId,
            username: req.username,
          });
        }
      } else {
        // No one left to approve anyone — let pending requesters in rather
        // than strand them.
        for (const requesterId of room.pending.keys()) {
          io.to(requesterId).emit("room:join-approved");
        }
        room.pending.clear();
      }
    }
    // ------------------------------------------------

    socket.to(roomId).emit("room:user-left", { socketId: socket.id });
    scheduleEvictionIfEmpty(roomId);
  }

  socket.leave(roomId);
  socket.data.roomId = null;
}

module.exports = roomHandler;