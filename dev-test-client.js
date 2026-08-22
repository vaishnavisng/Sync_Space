const { io } = require("socket.io-client");

const socket = io("http://localhost:5000");

socket.on("connect", () => {
  console.log("Test client connected:", socket.id);
  socket.emit("room:join", { roomId: "room1", username: "TestUser" });
});

socket.on("room:users", (users) => console.log("Current room users:", users));
socket.on("room:user-joined", (data) => console.log("User joined:", data));
socket.on("yjs:sync", (state) => console.log("Received initial doc state, bytes:", state.length));
socket.on("disconnect", () => console.log("Test client disconnected"));