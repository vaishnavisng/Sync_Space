const ROOM_ID_RE = /^[a-zA-Z0-9_-]{3,40}$/;

function isValidRoomId(roomId) {
  return typeof roomId === "string" && ROOM_ID_RE.test(roomId);
}

function sanitizeUsername(username) {
  if (typeof username !== "string" || !username.trim()) return "Anonymous";
  return username.trim().slice(0, 30);
}

module.exports = { isValidRoomId, sanitizeUsername };