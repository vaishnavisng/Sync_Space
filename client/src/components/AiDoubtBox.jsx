import { useEffect, useRef, useState } from "react";
import { askAi } from "../services/api";
import "./AiDoubtBox.css";

function AiDoubtBox({ code, language, fileName, errorOutput, onClose }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const bodyRef = useRef(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages, asking]);

  const ask = async () => {
    const trimmed = question.trim();
    if (!trimmed || asking) return;
    setMessages((prev) => [...prev, { id: `${Date.now()}_q`, role: "user", text: trimmed }]);
    setQuestion("");
    setAsking(true);
    try {
      const { answer } = await askAi({ question: trimmed, code, language, fileName, errorOutput });
      setMessages((prev) => [...prev, { id: `${Date.now()}_a`, role: "ai", text: answer }]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: `${Date.now()}_e`, role: "error", text: err.message }]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="ai-doubt-box">
      <div className="ai-doubt-box__bar">
        <span className="ai-doubt-box__title">Ask AI</span>
        <div className="ai-doubt-box__actions">
          <button onClick={() => setMessages([])} disabled={messages.length === 0}>Clear</button>
          <button onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="ai-doubt-box__body" ref={bodyRef}>
        {messages.length === 0 && (
          <div className="ai-doubt-box__hint">
            Ask about the code in this file, or about the last run's output/error.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`ai-doubt-box__msg ai-doubt-box__msg--${m.role}`}>
            {m.text}
          </div>
        ))}
        {asking && <div className="ai-doubt-box__msg ai-doubt-box__msg--pending">Thinking…</div>}
      </div>
      <div className="ai-doubt-box__input-row">
        <input
          type="text"
          placeholder="What's wrong with this code?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") ask();
          }}
          disabled={asking}
        />
        <button onClick={ask} disabled={asking || !question.trim()}>Ask</button>
      </div>
    </div>
  );
}

export default AiDoubtBox;
