function pingHandler(io, socket) {
  socket.on("ping:check", (clientSentAt) => {
    socket.emit("pong:check", clientSentAt);
  });
}

module.exports = pingHandler;