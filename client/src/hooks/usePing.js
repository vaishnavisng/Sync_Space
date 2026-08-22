import { useEffect, useState } from "react";
import socket from "../services/socket";

const PING_INTERVAL_MS = 3000;

export function usePing() {
  const [latency, setLatency] = useState(null);

  useEffect(() => {
    const onPong = (sentAt) => setLatency(Date.now() - sentAt);
    socket.on("pong:check", onPong);

    const sendPing = () => {
      if (socket.connected) socket.emit("ping:check", Date.now());
    };
    sendPing();
    const interval = setInterval(sendPing, PING_INTERVAL_MS);

    return () => {
      socket.off("pong:check", onPong);
      clearInterval(interval);
    };
  }, []);

  return latency;
}