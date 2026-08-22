import { useEffect, useState } from "react";
import { sendChatMessage } from "../lib/chatMessages";

export function useChat(ychat, username) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!ychat) return undefined;
    const sync = () => setMessages(ychat.toArray());
    sync();
    ychat.observe(sync);
    return () => ychat.unobserve(sync);
  }, [ychat]);

  const send = (text) => {
    if (!ychat) return;
    sendChatMessage(ychat, { username, text });
  };

  return { messages, send };
}