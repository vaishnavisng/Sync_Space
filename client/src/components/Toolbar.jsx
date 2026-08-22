import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./Toolbar.css";

const TOOLS = [
  { id: "select", label: "Select / Move", icon: "cursor" },
  { id: "pen", label: "Pen", icon: "pen" },
  { id: "rect", label: "Rectangle", icon: "rect" },
  { id: "ellipse", label: "Ellipse", icon: "ellipse" },
  { id: "triangle", label: "Triangle", icon: "triangle" },
  { id: "diamond", label: "Diamond", icon: "diamond" },
  { id: "line", label: "Line", icon: "line" },
  { id: "arrow", label: "Arrow", icon: "arrow" },
  { id: "text", label: "Text", icon: "text" },
  { id: "eraser", label: "Eraser", icon: "eraser" },
];

const QUICK_COLORS = ["#e7edf7", "#3fc6d6", "#3ddc97", "#f2b134", "#ff6b6b", "#c77dff"];

const PALETTE = [
  "#ffffff", "#e7edf7", "#a9b8d4", "#5b6478", "#131a2a", "#000000",
  "#3fc6d6", "#56d3e1", "#2596a1", "#1d7d87", "#0e4f57", "#093338",
  "#3ddc97", "#1b9e6b", "#7be495", "#c1f7dd", "#f2b134", "#ffcf5c",
  "#ff9f1c", "#c77dff", "#9d4edd", "#e0aaff", "#ff6b6b", "#d33f3f",
  "#ff8fab", "#fb6f92", "#7209b7", "#3a0ca3", "#4361ee", "#4cc9f0",
];

const WIDTHS = [2, 4, 8];

function Icon({ name }) {
  const props = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  switch (name) {
    case "cursor":
      return <svg {...props}><path d="M5 3l14 7-6 2-2 6-6-15z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
    case "pen":
      return <svg {...props}><path d="M12 20h9M3 20l1-4L16.5 3.5a2.1 2.1 0 013 3L7 18l-4 2z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "rect":
      return <svg {...props}><rect x="4" y="6" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" /></svg>;
    case "ellipse":
      return <svg {...props}><ellipse cx="12" cy="12" rx="8" ry="6" stroke="currentColor" strokeWidth="1.8" /></svg>;
    case "arrow":
      return <svg {...props}><path d="M5 19L19 5M19 5H10M19 5v9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "triangle":
      return <svg {...props}><path d="M12 4L20 19H4L12 4z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
    case "diamond":
      return <svg {...props}><path d="M12 3L21 12L12 21L3 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
    case "line":
      return <svg {...props}><path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
    case "fill":
      return <svg {...props}><rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.8" fill="currentColor" fillOpacity="0.35" /></svg>;
    case "text":
      return <svg {...props}><path d="M5 6h14M12 6v13M9 19h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
    case "eraser":
      return <svg {...props}><path d="M18 13l-7 7H7l-4-4a2 2 0 010-2.8l9-9a2 2 0 012.8 0l3.2 3.2a2 2 0 010 2.8L13 15" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>;
    case "wand":
      return (
        <svg {...props}>
          <path d="M4 20L20 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M15 4l1.5 1.5M19 8l1.5 1.5M4 15l1.5 1.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "undo":
      return <svg {...props}><path d="M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "redo":
      return <svg {...props}><path d="M15 7l5 5-5 5M20 12H9a5 5 0 000 10h1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "trash":
      return <svg {...props}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
    case "close":
      return <svg {...props}><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>;
    default:
      return null;
  }
}

function ColorPopover({ color, onColorChange, anchorRef, onClose }) {
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 10, left: r.left });
    }
  }, [anchorRef]);

  useEffect(() => {
    const handleClick = (e) => {
      if (popRef.current && !popRef.current.contains(e.target) && !anchorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [anchorRef, onClose]);

  return (
    <div ref={popRef} className="wb-color-popover" style={{ position: "fixed", top: pos.top, left: pos.left }}>
      <div className="wb-color-popover__grid">
        {PALETTE.map((c) => (
          <button
            key={c}
            className={`wb-color-popover__swatch ${color === c ? "is-active" : ""}`}
            style={{ background: c }}
            onClick={() => onColorChange(c)}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <div className="wb-color-popover__custom">
        <label className="wb-custom-color__swatch" style={{ background: color }} title="Pick custom color">
          <input type="color" value={color} onChange={(e) => onColorChange(e.target.value)} aria-label="Custom color picker" />
        </label>
        <input
          className="wb-custom-color__hex"
          value={color}
          onChange={(e) => onColorChange(e.target.value)}
          spellCheck={false}
          maxLength={7}
          aria-label="Custom color hex value"
        />
      </div>
    </div>
  );
}

export default function Toolbar({
  tool,
  onToolChange,
  color,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  autoShape,
  onAutoShapeChange,
  fillEnabled,
  onFillToggle,
  opacity,
  onOpacityChange,
  onUndo,
  onRedo,
  canUndo = true,
  canRedo = true,
  onClear,
  onClose,
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const customSwatchRef = useRef(null);

  // sliding gradient indicator behind the active tool
  const toolRefs = useRef({});
  const toolGroupRef = useRef(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });

  const measureIndicator = () => {
    const btn = toolRefs.current[tool];
    const group = toolGroupRef.current;
    if (btn && group) {
      const gRect = group.getBoundingClientRect();
      const bRect = btn.getBoundingClientRect();
      setIndicator({ left: bRect.left - gRect.left, width: bRect.width, ready: true });
    }
  };

  useLayoutEffect(measureIndicator, [tool]);

  useEffect(() => {
    window.addEventListener("resize", measureIndicator);
    return () => window.removeEventListener("resize", measureIndicator);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  return (
    <aside className="wb-toolbar">
      <div className="wb-toolbar__group wb-toolbar__tools" ref={toolGroupRef}>
        <span
          className="wb-tool-indicator"
          style={{
            left: `${indicator.left}px`,
            width: `${indicator.width}px`,
            opacity: indicator.ready ? 1 : 0,
          }}
        />
        {TOOLS.map((t) => (
          <button
            key={t.id}
            ref={(el) => (toolRefs.current[t.id] = el)}
            className={`wb-tool ${tool === t.id ? "is-active" : ""}`}
            title={t.label}
            aria-label={t.label}
            aria-pressed={tool === t.id}
            onClick={() => onToolChange(t.id)}
          >
            <Icon name={t.icon} />
          </button>
        ))}
      </div>
<div className="wb-toolbar__divider" />

      <div className="wb-toolbar__group">
        <button
          className={`wb-tool ${autoShape ? "is-active" : ""}`}
          title="Auto-detect shapes from pen scribbles"
          aria-label="Toggle shape auto-detection"
          aria-pressed={autoShape}
          onClick={() => onAutoShapeChange(!autoShape)}
        >
          <Icon name="wand" />
        </button>
      </div>

      <div className="wb-toolbar__divider" />

      <div className="wb-toolbar__group wb-toolbar__colors">
        {QUICK_COLORS.map((c) => (
          <button
            key={c}
            className={`wb-swatch ${color === c ? "is-active" : ""}`}
            style={{ background: c }}
            aria-label={`Color ${c}`}
            aria-pressed={color === c}
            onClick={() => onColorChange(c)}
          />
        ))}
        <button
          ref={customSwatchRef}
          className="wb-custom-color__trigger"
          title="More colors"
          aria-label="More colors"
          onClick={() => setPaletteOpen((v) => !v)}
        >
          +
        </button>
        {paletteOpen && (
          <ColorPopover
            color={color}
            onColorChange={onColorChange}
            anchorRef={customSwatchRef}
            onClose={() => setPaletteOpen(false)}
          />
        )}
      </div>

      <div className="wb-toolbar__divider" />

      <div className="wb-toolbar__group wb-toolbar__widths">
        {WIDTHS.map((w) => (
          <button
            key={w}
            className={`wb-width ${strokeWidth === w ? "is-active" : ""}`}
            title={`Stroke ${w}px`}
            aria-label={`Stroke width ${w}px`}
            aria-pressed={strokeWidth === w}
            onClick={() => onStrokeWidthChange(w)}
          >
            <span style={{ width: w + 2, height: w + 2 }} />
          </button>
        ))}
      </div>

      <div className="wb-toolbar__divider" />
      
      <div className="wb-toolbar__group wb-toolbar__fill">
        <button
          className={`wb-tool ${fillEnabled ? "is-active" : ""}`}
          title="Fill shapes (off = transparent/outline only)"
          aria-label="Toggle fill"
          aria-pressed={fillEnabled}
          onClick={() => onFillToggle(!fillEnabled)}
        >
          <Icon name="fill" />
        </button>
        <input
          type="range"
          className="wb-opacity"
          min="10"
          max="100"
          value={Math.round(opacity * 100)}
          onChange={(e) => onOpacityChange(Number(e.target.value) / 100)}
          title={`Opacity: ${Math.round(opacity * 100)}%`}
          aria-label="Opacity"
        />
      </div>

<div className="wb-toolbar__divider" />

      <div className="wb-toolbar__group">
        <button className="wb-tool" title="Undo" aria-label="Undo" onClick={onUndo} disabled={!canUndo}>
          <Icon name="undo" />
        </button>
        <button className="wb-tool" title="Redo" aria-label="Redo" onClick={onRedo} disabled={!canRedo}>
          <Icon name="redo" />
        </button>
        <button
          className="wb-tool wb-tool--danger"
          title="Clear board"
          aria-label="Clear board"
          onClick={() => {
            if (window.confirm("Clear the entire whiteboard? This can't be undone.")) {
              onClear();
            }
          }}
        >
          <Icon name="trash" />
        </button>
      </div>

      <div className="wb-toolbar__divider" />

      <button className="wb-tool wb-tool--close" title="Back to code (Esc)" aria-label="Close whiteboard" onClick={onClose}>
        <Icon name="close" />
      </button>
    </aside>
  );
}