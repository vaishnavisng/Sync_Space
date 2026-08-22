const roomHandler = require("./roomHandler");
const yjsHandler = require("./yjsHandler");

function registerSocketHandlers(io, socket) {
  roomHandler(io, socket);
  yjsHandler(io, socket);
}

module.exports = registerSocketHandlers;