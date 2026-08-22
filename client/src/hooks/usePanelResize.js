import { useEffect, useRef, useState } from "react";

export function usePanelResize({ defaultHeight = 200, min = 120, max = 600 } = {}) {
  const [height, setHeight] = useState(defaultHeight);
  const [resizing, setResizing] = useState(false);
  const startRef = useRef({ y: 0, height: defaultHeight });

  const onDragStart = (e) => {
    e.preventDefault();
    const point = e.touches ? e.touches[0] : e;
    startRef.current = { y: point.clientY, height };
    setResizing(true);
  };

  useEffect(() => {
    if (!resizing) return undefined;

    const clamp = (v) => Math.min(max, Math.max(min, v));
    // dragging the handle up (toward the editor) should grow the panel below it
    const onMove = (e) => {
      const point = e.touches ? e.touches[0] : e;
      const delta = startRef.current.y - point.clientY;
      setHeight(clamp(startRef.current.height + delta));
    };
    const onUp = () => setResizing(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  }, [resizing, min, max]);

  return { height, resizing, onDragStart };
}
