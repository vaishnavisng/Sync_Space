const { isValidRoomId, sanitizeUsername } = require("./validators");

function chatTypingHandler(io, socket) {
  socket.on("chat:typing", ({ roomId, username, isTyping }) => {
    if (!isValidRoomId(roomId)) return;
    socket.to(roomId).emit("chat:typing", {
      socketId: socket.id,
      username: sanitizeUsername(username),
      isTyping: !!isTyping,
    });
  });

  // If someone disconnects mid-type, tell the room their dots should stop —
  // otherwise a dropped connection leaves a stuck "typing…" indicator.
  socket.on("disconnect", () => {
    if (socket.data.roomId) {
      socket.to(socket.data.roomId).emit("chat:typing", { socketId: socket.id, isTyping: false });
    }
  });
}

module.exports = chatTypingHandler;