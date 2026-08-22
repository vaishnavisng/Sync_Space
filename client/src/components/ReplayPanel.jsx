import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import { Stage, Layer, Line, Rect, Ellipse, Arrow, Text } from "react-konva";
import { fetchReplayHistory } from "../services/api";
import { buildSnapshotAt } from "../lib/replay";
import "./ReplayPanel.css";

function formatTimestamp(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function ReadOnlyShape({ s }) {
  if (s.tool === "rect") return <Rect x={s.x} y={s.y} width={s.width} height={s.height} stroke={s.color} strokeWidth={s.strokeWidth} />;
  if (s.tool === "ellipse") return <Ellipse x={s.x + s.width / 2} y={s.y + s.height / 2} radiusX={s.width / 2} radiusY={s.height / 2} stroke={s.color} strokeWidth={s.strokeWidth} />;
  if (s.tool === "arrow") return <Arrow x={s.offsetX || 0} y={s.offsetY || 0} points={s.points} stroke={s.color} fill={s.color} strokeWidth={s.strokeWidth} />;
  if (s.tool === "text") return <Text x={s.x} y={s.y} text={s.text} fontSize={s.fontSize} fill={s.color} />;
  return (
    <Line
      x={s.offsetX || 0}
      y={s.offsetY || 0}
      points={s.points}
      stroke={s.tool === "eraser" ? "#000" : s.color}
      strokeWidth={s.strokeWidth}
      tension={s.tool === "eraser" ? 0 : 0.5}
      lineCap="round"
      lineJoin="round"
      globalCompositeOperation={s.tool === "eraser" ? "destination-out" : "source-over"}
    />
  );
}

function ReplayPanel({ roomId, onClose }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [activeFileId, setActiveFileId] = useState(null);
  const playTimer = useRef(null);

  useEffect(() => {
    fetchReplayHistory(roomId)
      .then((data) => {
        setHistory(data.history);
        setIndex(Math.max(0, data.history.length - 1));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [roomId]);

  useEffect(() => {
    if (!playing) { clearInterval(playTimer.current); return undefined; }
    playTimer.current = setInterval(() => {
      setIndex((i) => {
        if (i >= history.length - 1) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 400);
    return () => clearInterval(playTimer.current);
  }, [playing, history.length]);

  const snapshot = useMemo(() => {
    if (history.length === 0) return { files: [], shapes: [] };
    return buildSnapshotAt(history, index);
  }, [history, index]);

  const activeFile = snapshot.files.find((f) => f.id === activeFileId) || snapshot.files[0] || null;

  return (
    <div className="replay-overlay" onClick={onClose}>
      <div className="replay-panel" onClick={(e) => e.stopPropagation()}>
        <div className="replay-panel__header">
          <span>Session Replay</span>
          <button className="replay-panel__close" onClick={onClose} aria-label="Close replay">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
          </button>
        </div>

        {loading && <div className="replay-panel__status">Loading session history…</div>}
        {error && <div className="replay-panel__status replay-panel__status--error">{error}</div>}
        {!loading && !error && history.length === 0 && (
          <div className="replay-panel__status">No recorded history yet — check back after some editing has happened.</div>
        )}

        {!loading && !error && history.length > 0 && (
          <>
            <div className="replay-panel__body">
              <div className="replay-panel__files">
                {snapshot.files.map((f) => (
                  <button key={f.id} className={`replay-panel__file ${activeFile?.id === f.id ? "is-active" : ""}`} onClick={() => setActiveFileId(f.id)}>
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="replay-panel__editor">
                {activeFile ? (
                  <Editor
                    key={activeFile.id + index}
                    language={activeFile.language}
                    theme="vs-dark"
                    value={activeFile.content}
                    options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, automaticLayout: true }}
                  />
                ) : (
                  <div className="replay-panel__empty">No files yet at this point in time.</div>
                )}
              </div>

              <div className="replay-panel__board">
                <Stage width={360} height={280}>
                  <Layer>{snapshot.shapes.map((s) => <ReadOnlyShape key={s.id} s={s} />)}</Layer>
                </Stage>
              </div>
            </div>

            <div className="replay-panel__controls">
              <button className="replay-panel__play" onClick={() => setPlaying((p) => !p)}>{playing ? "Pause" : "Play"}</button>
              <input type="range" min={0} max={history.length - 1} value={index} onChange={(e) => { setPlaying(false); setIndex(Number(e.target.value)); }} />
              <span className="replay-panel__time">{formatTimestamp(history[index].timestamp)}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ReplayPanel;