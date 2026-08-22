import { useEffect, useRef, useState } from "react";
import { useChat } from "../hooks/useChat";
import { useTypingIndicator } from "../hooks/useTypingIndicator";
import "./ChatPanel.css";

function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 65%, 55%)`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatPanel({ ychat, username, roomId }) {
  const { messages, send } = useChat(ychat, username);
  const { typingUsers, notifyTyping, notifyStoppedTyping } = useTypingIndicator(roomId, username);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const bodyRef = useRef(null);
  const lastSeenCount = useRef(0);

  useEffect(() => {
    if (open) {
      setUnread(0);
      lastSeenCount.current = messages.length;
    } else if (messages.length > lastSeenCount.current) {
      setUnread(messages.length - lastSeenCount.current);
    }
  }, [messages.length, open]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, open, typingUsers.length]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!draft.trim()) return;
    send(draft);
    setDraft("");
    notifyStoppedTyping();
  };

  const handleChange = (e) => {
    setDraft(e.target.value);
    if (e.target.value.trim()) notifyTyping();
    else notifyStoppedTyping();
  };

  return (
    <>
      <button className="chat-toggle" onClick={() => setOpen((v) => !v)} title="Room chat">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M4 5h16a1 1 0 011 1v10a1 1 0 01-1 1H9l-5 4V6a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        </svg>
        {unread > 0 && <span className="chat-toggle__badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-panel__header">
            <span>Room Chat</span>
            <button className="chat-panel__close" onClick={() => setOpen(false)} aria-label="Close chat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div className="chat-panel__body" ref={bodyRef}>
            {messages.length === 0 && typingUsers.length === 0 && <div className="chat-panel__empty">No messages yet — say hi.</div>}
            {messages.map((m) => (
              <div key={m.id} className={`chat-msg ${m.username === username ? "is-own" : ""}`}>
                <span className="chat-msg__avatar" style={{ background: stringToColor(m.username) }}>
                  {(m.username || "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="chat-msg__bubble">
                  <div className="chat-msg__meta">
                    <span className="chat-msg__name">{m.username}</span>
                    <span className="chat-msg__time">{formatTime(m.createdAt)}</span>
                  </div>
                  <div className="chat-msg__text">{m.text}</div>
                </div>
              </div>
            ))}

            {typingUsers.map((u) => (
              <div key={u.socketId} className="chat-msg chat-msg--typing">
                <span className="chat-msg__avatar" style={{ background: stringToColor(u.username) }}>
                  {(u.username || "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="typing-dots" aria-label={`${u.username} is typing`}>
                  <span className="typing-dots__dot" />
                  <span className="typing-dots__dot" />
                  <span className="typing-dots__dot" />
                </div>
              </div>
            ))}
          </div>

          <form className="chat-panel__input" onSubmit={handleSend}>
            <input value={draft} onChange={handleChange} placeholder="Message the room…" maxLength={500} />
            <button type="submit" disabled={!draft.trim()} aria-label="Send">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M4 12l16-8-6 8 6 8-16-8z" fill="currentColor" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}

export default ChatPanel;