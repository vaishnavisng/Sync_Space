import { useCallback, useEffect, useRef, useState } from "react";
import socket from "../services/socket";
import { SOCKET_EVENTS } from "../utils/constants";

const STOP_DELAY_MS = 2500;

export function useTypingIndicator(roomId, username) {
  const [typingUsers, setTypingUsers] = useState([]); // [{ socketId, username }]
  const isTypingRef = useRef(false);
  const stopTimerRef = useRef(null);

  useEffect(() => {
    const onTyping = ({ socketId, username: typerName, isTyping }) => {
      setTypingUsers((prev) => {
        if (isTyping) {
          return prev.some((u) => u.socketId === socketId) ? prev : [...prev, { socketId, username: typerName }];
        }
        return prev.filter((u) => u.socketId !== socketId);
      });
    };
    socket.on(SOCKET_EVENTS.CHAT_TYPING, onTyping);
    return () => socket.off(SOCKET_EVENTS.CHAT_TYPING, onTyping);
  }, []);

  // Clear our own typing state (and tell the room) whenever we leave/change rooms.
  useEffect(() => {
    return () => {
      clearTimeout(stopTimerRef.current);
      if (isTypingRef.current) {
        socket.emit(SOCKET_EVENTS.CHAT_TYPING, { roomId, username, isTyping: false });
        isTypingRef.current = false;
      }
      setTypingUsers([]);
    };
  }, [roomId, username]);

  const notifyTyping = useCallback(() => {
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit(SOCKET_EVENTS.CHAT_TYPING, { roomId, username, isTyping: true });
    }
    clearTimeout(stopTimerRef.current);
    stopTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit(SOCKET_EVENTS.CHAT_TYPING, { roomId, username, isTyping: false });
    }, STOP_DELAY_MS);
  }, [roomId, username]);

  const notifyStoppedTyping = useCallback(() => {
    clearTimeout(stopTimerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit(SOCKET_EVENTS.CHAT_TYPING, { roomId, username, isTyping: false });
    }
  }, [roomId, username]);

  return { typingUsers, notifyTyping, notifyStoppedTyping };
}