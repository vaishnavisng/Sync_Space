import { Stage, Layer, Line, Rect, Ellipse, Arrow, Text } from "react-konva";
import { useEffect, useRef, useState } from "react";
import { addShape, updateLastShape, updateShapeById, eraseAtPoint } from "../lib/yShapes";
import { detectShape } from "../lib/shapeDetect";
import "./Whiteboard.css";
import { useSettings } from "../context/SettingsContext";
import { useAwareness } from "../hooks/useAwareness";

const FREEHAND_TOOLS = ["pen"];
const BOX_TOOLS = ["rect", "ellipse", "triangle", "diamond"];
const ERASER_RADIUS = 14;

const CURSOR_BY_TOOL = {
  select: "default",
  text: "text",
  eraser: "cell",
  pen: "crosshair",
  rect: "crosshair",
  ellipse: "crosshair",
  triangle: "crosshair",
  diamond: "crosshair",
  arrow: "crosshair",
  line: "crosshair",
};

function genId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function Whiteboard({ yshapes, tool, color, strokeWidth, onToolChange, autoShape, fillEnabled, opacity, awareness, ydoc }) {
  const containerRef = useRef(null);
  const activeStrokeId = useRef(null);
  const textareaRef = useRef(null);
  const cursorPosRef = useRef(null);
  const cursorRafPending = useRef(false);
  const drawIdleTimer = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });
  const [shapes, setShapes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const { settings } = useSettings();
  const remoteUsers = useAwareness(awareness).filter((u) => u.clientId !== ydoc?.clientID && u.cursor);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setSize({ width, height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!yshapes) return undefined;
    const sync = () => setShapes(yshapes.toArray());
    sync();
    yshapes.observe(sync);
    return () => yshapes.unobserve(sync);
  }, [yshapes]);

  useEffect(() => {
    setSelectedId(null);
  }, [tool]);

  useEffect(() => {
  if (!editingText || !textareaRef.current) return undefined;
  const raf = requestAnimationFrame(() => textareaRef.current?.focus());
  return () => cancelAnimationFrame(raf);
  // only re-run when a *new* text box opens, not on every keystroke
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [editingText?.x, editingText?.y]);

  const commitTextEdit = () => {
    const value = editingText?.value.trim();
    if (value && yshapes) {
      addShape(yshapes, {
        id: genId(),
        tool: "text",
        x: editingText.x,
        y: editingText.y,
        text: value,
        color,
        fontSize: 18,
        offsetX: 0,
        offsetY: 0,
      });
    }
    setEditingText(null);
    onToolChange?.("select");
  };

  const handleMouseDown = (e) => {
    console.log("[Whiteboard] mousedown, tool =", tool);
    if (!yshapes) return;
    const stage = e.target.getStage();
    const isEmptyStage = e.target === stage;
    const pos = stage.getPointerPosition();

    if (tool === "select") {
      if (isEmptyStage) setSelectedId(null);
      return;
    }
    if (tool === "eraser") {
      setIsDrawing(true);
      markDrawing();
      eraseAtPoint(yshapes, pos.x, pos.y, ERASER_RADIUS);
      return;
    }
    if (tool === "text") {
      console.log("[Whiteboard] text tool click, isEmptyStage =", isEmptyStage, "target =", e.target);
      if (editingText) commitTextEdit();
      setEditingText({ x: pos.x, y: pos.y, value: "" });
      return;
    }

    if (FREEHAND_TOOLS.includes(tool)) {
       setIsDrawing(true);
       markDrawing();
       const id = genId();
       activeStrokeId.current = id;
       addShape(yshapes, { id, tool, color, strokeWidth, points: [pos.x, pos.y], offsetX: 0, offsetY: 0 });
    } else if (BOX_TOOLS.includes(tool)) {
      setIsDrawing(true);
      markDrawing();
      setStartPoint(pos);
      addShape(yshapes, { id: genId(), tool, color, strokeWidth, x: pos.x, y: pos.y, width: 0, height: 0 });
    } else if (tool === "arrow" || tool === "line") {
      setIsDrawing(true);
      markDrawing();
      setStartPoint(pos);
      addShape(yshapes, { id: genId(), tool, color, strokeWidth, opacity, points: [pos.x, pos.y, pos.x, pos.y], offsetX: 0, offsetY: 0 });
    }
  };

  const markDrawing = () => {
    if (!awareness) return;
    awareness.setLocalStateField("activity", "drawing");
    clearTimeout(drawIdleTimer.current);
    drawIdleTimer.current = setTimeout(() => {
      awareness.setLocalStateField("activity", "idle");
    }, 2000);
  };

  useEffect(() => () => clearTimeout(drawIdleTimer.current), []);

  const broadcastCursor = (pos) => {
    if (!awareness || !pos) return;
    cursorPosRef.current = { x: pos.x, y: pos.y };
    if (cursorRafPending.current) return;
    cursorRafPending.current = true;
    requestAnimationFrame(() => {
      cursorRafPending.current = false;
      if (cursorPosRef.current) awareness.setLocalStateField("cursor", cursorPosRef.current);
    });
  };

  const handleMouseLeave = () => {
    awareness?.setLocalStateField("cursor", null);
  };

  const handleMouseMove = (e) => {
    const pos = e.target.getStage().getPointerPosition();
    broadcastCursor(pos);

    if (!isDrawing || !yshapes) return;
    markDrawing();

    if (tool === "eraser") {
      eraseAtPoint(yshapes, pos.x, pos.y, ERASER_RADIUS);
      return;
    }

    const last = shapes[shapes.length - 1];
    if (!last) return;

    if (FREEHAND_TOOLS.includes(last.tool)) {
      updateLastShape(yshapes, { points: [...last.points, pos.x, pos.y] });
    } else if (BOX_TOOLS.includes(last.tool) && startPoint) {
      updateLastShape(yshapes, {
        x: Math.min(startPoint.x, pos.x),
        y: Math.min(startPoint.y, pos.y),
        width: Math.abs(pos.x - startPoint.x),
        height: Math.abs(pos.y - startPoint.y),
      });
    } else if ((last.tool === "arrow" || last.tool === "line") && startPoint) {
      updateLastShape(yshapes, { points: [startPoint.x, startPoint.y, pos.x, pos.y] });
    }
  };

  const handleMouseUp = () => {
  if (tool === "pen" && autoShape && activeStrokeId.current && yshapes) {
    const strokeShape = yshapes.toArray().find((s) => s.id === activeStrokeId.current);
    if (strokeShape) {
      const detected = detectShape(strokeShape.points || []);
      if (detected) updateShapeById(yshapes, strokeShape.id, detected);
    }
  }
  activeStrokeId.current = null;
  setIsDrawing(false);
  setStartPoint(null);
};

  const selectableProps = (s) =>
  tool === "select"
    ? {
        draggable: true,
        onClick: () => setSelectedId(s.id),
        onTap: () => setSelectedId(s.id),
        onDragEnd: (e) => {
          if (["rect", "text", "triangle", "diamond"].includes(s.tool)) {
            updateShapeById(yshapes, s.id, { x: e.target.x(), y: e.target.y() });
          } else if (s.tool === "ellipse") {
            updateShapeById(yshapes, s.id, {
              x: e.target.x() - s.width / 2,
              y: e.target.y() - s.height / 2,
            });
          } else {
            updateShapeById(yshapes, s.id, { offsetX: e.target.x(), offsetY: e.target.y() });
          }
        },
      }
    : {};

  return (
    <div
      ref={containerRef}
      className={`wb-canvas-surface ${settings.showGrid ? "" : "wb-canvas-surface--no-grid"}`}
      style={{ width: "100%", height: "100%", position: "relative", cursor: CURSOR_BY_TOOL[tool] || "default" }}
      onMouseLeave={handleMouseLeave}
    >
      <Stage width={size.width} height={size.height} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}>
        <Layer>
          {shapes.map((s) => {
            const stroke = s.id === selectedId ? "#3fc6d6" : s.color;

            if (s.tool === "rect") {
              return (
                <Rect
                  key={s.id}
                  x={s.x} y={s.y} width={s.width} height={s.height}
                  stroke={stroke}
                  fill={s.fill ? s.color : undefined}
                  opacity={s.opacity ?? 1}
                  strokeWidth={s.strokeWidth}
                  dash={s.id === selectedId ? [4, 4] : undefined}
                  {...selectableProps(s)}
                />
              );
            }
            if (s.tool === "ellipse") {
              return (
                <Ellipse
                  key={s.id}
                  x={s.x + s.width / 2} y={s.y + s.height / 2}
                  radiusX={s.width / 2} radiusY={s.height / 2}
                  stroke={stroke}
                  fill={s.fill ? s.color : undefined}
                  opacity={s.opacity ?? 1}
                  strokeWidth={s.strokeWidth}
                  dash={s.id === selectedId ? [4, 4] : undefined}
                  {...selectableProps(s)}
                />
              );
            }

            if (s.tool === "triangle") {
              const pts = [
                s.x + s.width / 2, s.y,
                s.x, s.y + s.height,
                s.x + s.width, s.y + s.height,
              ];
              return (
                <Line
                  key={s.id} points={pts} closed
                  stroke={stroke}
                  fill={s.fill ? s.color : undefined}
                  opacity={s.opacity ?? 1}
                  strokeWidth={s.strokeWidth}
                  dash={s.id === selectedId ? [4, 4] : undefined}
                  {...selectableProps(s)}
                />
              );
            }
            if (s.tool === "diamond") {
              const pts = [
                s.x + s.width / 2, s.y,
                s.x + s.width, s.y + s.height / 2,
                s.x + s.width / 2, s.y + s.height,
                s.x, s.y + s.height / 2,
              ];
              return (
                <Line
                  key={s.id} points={pts} closed
                  stroke={stroke}
                  fill={s.fill ? s.color : undefined}
                  opacity={s.opacity ?? 1}
                  strokeWidth={s.strokeWidth}
                  dash={s.id === selectedId ? [4, 4] : undefined}
                  {...selectableProps(s)}
                />
              );
            }
            if (s.tool === "arrow") {
              return (
                <Arrow key={s.id} x={s.offsetX || 0} y={s.offsetY || 0} points={s.points} stroke={stroke} fill={stroke} opacity={s.opacity ?? 1} strokeWidth={s.strokeWidth} {...selectableProps(s)} />
              );
            }
            if (s.tool === "line") {
              return (
                <Line key={s.id} x={s.offsetX || 0} y={s.offsetY || 0} points={s.points} stroke={stroke} opacity={s.opacity ?? 1} strokeWidth={s.strokeWidth} lineCap="round" {...selectableProps(s)} />
              );
            }
            if (s.tool === "text") {
              return (
                <Text key={s.id} x={s.x} y={s.y} text={s.text} fontSize={s.fontSize} fill={stroke} {...selectableProps(s)} />
              );
            }
            return (
              <Line
                key={s.id}
                x={s.offsetX || 0}
                y={s.offsetY || 0}
                points={s.points}
                stroke={stroke}
                strokeWidth={s.strokeWidth}
                tension={0.5}
                lineCap="round"
                lineJoin="round"
                {...selectableProps(s)}
              />
            );
          })}
        </Layer>
      </Stage>

      {remoteUsers.map((u) => (
        <div
          key={u.clientId}
          className="wb-remote-cursor"
          style={{ left: u.cursor.x, top: u.cursor.y }}
        >
          <span className="wb-remote-cursor__dot" style={{ background: u.color }} />
          <span className="wb-remote-cursor__label" style={{ background: u.color }}>
            {u.name}
          </span>
        </div>
      ))}

      {editingText && (
  <textarea
    ref={textareaRef}
    value={editingText.value}
    onChange={(e) => setEditingText({ ...editingText, value: e.target.value })}
    onBlur={commitTextEdit}
    onKeyDown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        commitTextEdit();
      } else if (e.key === "Escape") {
        setEditingText(null);
        onToolChange?.("select");
      }
    }}
    style={{
      position: "absolute",
      left: editingText.x,
      top: editingText.y,
      fontSize: 18,
      color,
      background: "transparent",
      border: "1px dashed #3fc6d6",
      outline: "none",
      resize: "none",
      minWidth: 120,
      minHeight: 28,
      zIndex: 30,
    }}
  />
)}
    </div>
  );
}

export default Whiteboard;