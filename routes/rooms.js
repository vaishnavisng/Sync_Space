const express = require("express");
const crypto = require("crypto");
const { roomExists, listUsers } = require("../sockets/roomStore");

const router = express.Router();

function generateRoomId() {
  return crypto.randomBytes(4).toString("hex"); // e.g. "a3f9c1d2"
}

// POST /api/rooms  -> mints a shareable room code for CreateRoom.jsx to display
router.post("/", (req, res) => {
  res.status(201).json({ roomId: generateRoomId() });
});

// GET /api/rooms/:roomId -> lets JoinRoom.jsx show "N people already here"
router.get("/:roomId", (req, res) => {
  const { roomId } = req.params;
  const active = roomExists(roomId);
  res.json({
    roomId,
    active,
    userCount: active ? listUsers(roomId).length : 0,
  });
});

module.exports = router;