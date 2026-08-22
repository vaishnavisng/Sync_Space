import { useEffect, useRef, useState } from "react";
import { runCode } from "../lib/runCode";
import "./Terminal.css";

function Terminal({ code, language, autoRunToken, onClose, onOutputChange }) {
  const [lines, setLines] = useState([]);
  const [running, setRunning] = useState(false);
  const controllerRef = useRef(null);
  const bodyRef = useRef(null);
  const startRef = useRef(0);

  const append = (kind, args) => {
    setLines((prev) => [...prev, { id: `${Date.now()}_${Math.random()}`, kind, text: args.join(" ") }]);
  };

  const run = () => {
    if (running) return;
    setLines([]);
    setRunning(true);
    startRef.current = performance.now();
    append("meta", [`▶ running ${language}…`]);
    controllerRef.current = runCode(code, language, {
      onMessage: (msg) => append(msg.kind, msg.args),
      onDone: (reason) => {
        setRunning(false);
        if (reason === "complete") append("meta", [`✓ finished in ${Math.round(performance.now() - startRef.current)}ms`]);
      },
    });
  };

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  useEffect(() => {
    onOutputChange?.(lines.map((l) => l.text).join("\n"));
  }, [lines, onOutputChange]);

  useEffect(() => {
    if (autoRunToken) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRunToken]);

  useEffect(() => () => controllerRef.current?.stop(), []);

  return (
    <div className="terminal">
      <div className="terminal__bar">
        <span className="terminal__title">Terminal</span>
        <div className="terminal__actions">
          <button onClick={run} disabled={running}>Run</button>
          <button onClick={() => controllerRef.current?.stop()} disabled={!running}>Stop</button>
          <button onClick={() => setLines([])}>Clear</button>
          <button onClick={onClose}>✕</button>
        </div>
      </div>
      <div className="terminal__body" ref={bodyRef}>
        {lines.length === 0 && !running && <div className="terminal__hint">Press Run to execute (JavaScript, TypeScript, or Python).</div>}
        {lines.map((l) => (
          <div key={l.id} className={`terminal__line terminal__line--${l.kind}`}>{l.text}</div>
        ))}
      </div>
    </div>
  );
}

export default Terminal;