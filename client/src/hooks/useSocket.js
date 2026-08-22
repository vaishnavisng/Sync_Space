import { useEffect, useRef, useState } from "react";
import socket from "../services/socket";
import { SOCKET_EVENTS } from "../utils/constants";

export function useSocket(roomId, username) {
  const [connected, setConnected] = useState(socket.connected);
  const [connecting, setConnecting] = useState(true);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [joinStatus, setJoinStatus] = useState("idle"); // idle | pending | approved | denied
  const [pendingRequests, setPendingRequests] = useState([]);
  const joinedRoomRef = useRef(null);

  const isAdmin = users.some((u) => u.socketId === socket.id && u.isAdmin);

  useEffect(() => {
    if (!roomId) return undefined;
    setJoinStatus("idle");

    if (!socket.connected) socket.connect();

    const requestJoin = () => {
      setJoinStatus("pending");
      socket.emit(SOCKET_EVENTS.ROOM_REQUEST_JOIN, { roomId, username });
    };

    const onConnect = () => {
      setConnected(true);
      requestJoin();
    };
    const onDisconnect = () => {
      setConnected(false);
      setConnecting(true);
      setJoinStatus("idle");
    };

    const onJoinApproved = () => {
      setJoinStatus("approved");
      socket.emit(SOCKET_EVENTS.ROOM_JOIN, { roomId, username });
      joinedRoomRef.current = roomId;
    };
    const onJoinDenied = () => setJoinStatus("denied");
    const onIncomingRequest = ({ requesterId, username: reqUsername }) => {
      setPendingRequests((prev) =>
        prev.some((r) => r.requesterId === requesterId) ? prev : [...prev, { requesterId, username: reqUsername }]
      );
    };

    const onUsers = (list) => {
      setUsers(list);
      setConnecting(false);
    };
    const onUserJoined = (u) => setUsers((prev) => [...prev, u]);
    const onUserLeft = ({ socketId }) => setUsers((prev) => prev.filter((u) => u.socketId !== socketId));
    const onRoomError = ({ message }) => setError(message);
    const onKicked = () => setJoinStatus("kicked");

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on(SOCKET_EVENTS.ROOM_JOIN_APPROVED, onJoinApproved);
    socket.on(SOCKET_EVENTS.ROOM_JOIN_DENIED, onJoinDenied);
    socket.on(SOCKET_EVENTS.ROOM_INCOMING_JOIN_REQUEST, onIncomingRequest);
    socket.on(SOCKET_EVENTS.ROOM_USERS, onUsers);
    socket.on(SOCKET_EVENTS.ROOM_USER_JOINED, onUserJoined);
    socket.on(SOCKET_EVENTS.ROOM_USER_LEFT, onUserLeft);
    socket.on("room:error", onRoomError);
    socket.on(SOCKET_EVENTS.ROOM_KICKED, onKicked);

    if (socket.connected) onConnect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off(SOCKET_EVENTS.ROOM_JOIN_APPROVED, onJoinApproved);
      socket.off(SOCKET_EVENTS.ROOM_JOIN_DENIED, onJoinDenied);
      socket.off(SOCKET_EVENTS.ROOM_INCOMING_JOIN_REQUEST, onIncomingRequest);
      socket.off(SOCKET_EVENTS.ROOM_USERS, onUsers);
      socket.off(SOCKET_EVENTS.ROOM_USER_JOINED, onUserJoined);
      socket.off(SOCKET_EVENTS.ROOM_USER_LEFT, onUserLeft);
      socket.off("room:error", onRoomError);
      socket.off(SOCKET_EVENTS.ROOM_KICKED, onKicked);
      if (joinedRoomRef.current) {
        socket.emit(SOCKET_EVENTS.ROOM_LEAVE);
        joinedRoomRef.current = null;
      }
    };
  }, [roomId, username]);

  const approveJoin = (requesterId) => {
    socket.emit(SOCKET_EVENTS.ROOM_APPROVE_JOIN, { roomId, requesterId });
    setPendingRequests((prev) => prev.filter((r) => r.requesterId !== requesterId));
  };
  const denyJoin = (requesterId) => {
    socket.emit(SOCKET_EVENTS.ROOM_DENY_JOIN, { roomId, requesterId });
    setPendingRequests((prev) => prev.filter((r) => r.requesterId !== requesterId));
  };

  const kickUser = (targetSocketId) => {
  socket.emit(SOCKET_EVENTS.ROOM_KICK, { roomId, targetSocketId });
};

return { socket, connected, connecting, users, error, joinStatus, isAdmin, pendingRequests, approveJoin, denyJoin, kickUser };}