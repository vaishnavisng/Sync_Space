export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Must match the event names emitted/listened to in sockets/roomHandler.js
// and sockets/yjsHandler.js on the backend.
export const SOCKET_EVENTS = {
  ROOM_JOIN: "room:join",
  ROOM_LEAVE: "room:leave",
  ROOM_USERS: "room:users",
  ROOM_USER_JOINED: "room:user-joined",
  ROOM_USER_LEFT: "room:user-left",
  YJS_SYNC: "yjs:sync",
  YJS_UPDATE: "yjs:update",
  AWARENESS_UPDATE: "awareness:update",

  ROOM_REQUEST_JOIN: "room:request-join",
  ROOM_JOIN_APPROVED: "room:join-approved",
  ROOM_JOIN_DENIED: "room:join-denied",
  ROOM_INCOMING_JOIN_REQUEST: "room:incoming-join-request",
  ROOM_APPROVE_JOIN: "room:approve-join",
  ROOM_DENY_JOIN: "room:deny-join",

  ROOM_KICK: "room:kick",
  ROOM_KICKED: "room:kicked",
};