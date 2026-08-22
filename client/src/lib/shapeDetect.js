// Heuristic freehand -> vector shape recognizer.
// Runs once, on stroke release, against the full point list of a "pen" shape.
// Returns null if nothing is confidently detected (keeps the freehand stroke as-is).

function toPointList(flatPoints) {
  const pts = [];
  for (let i = 0; i < flatPoints.length - 1; i += 2) {
    pts.push({ x: flatPoints[i], y: flatPoints[i + 1] });
  }
  return pts;
}

function pathLength(pts) {
  let len = 0;
  for (let i = 1; i < pts.length; i++) {
    len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  return len;
}

// Shoelace formula - approximate area enclosed by the raw stroke path.
function polygonArea(pts) {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area / 2);
}

// Counts sharp direction changes along the path (i.e. corners), merging
// nearby detections so one wobbly hand-drawn corner isn't counted twice.
function countCorners(pts) {
  if (pts.length < 10) return 0;
  const step = Math.max(1, Math.floor(pts.length / 40));
  const hits = [];

  for (let i = step; i < pts.length - step; i += step) {
    const a = pts[i - step];
    const b = pts[i];
    const c = pts[i + step];
    const v1 = Math.atan2(b.y - a.y, b.x - a.x);
    const v2 = Math.atan2(c.y - b.y, c.x - b.x);
    let diff = Math.abs(v2 - v1);
    if (diff > Math.PI) diff = 2 * Math.PI - diff;
    if (diff > 0.55) hits.push(i); // ~31 degrees+
  }

  const merged = [];
  const minGap = pts.length * 0.08;
  hits.forEach((i) => {
    if (merged.length === 0 || i - merged[merged.length - 1] > minGap) merged.push(i);
  });
  return merged.length;
}

export function detectShape(flatPoints) {
  const pts = toPointList(flatPoints);
  if (pts.length < 8) return null;

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const width = maxX - minX;
  const height = maxY - minY;
  if (width < 12 || height < 12) return null; // too small - likely a dot/noise

  const first = pts[0];
  const last = pts[pts.length - 1];
  const diag = Math.hypot(width, height);
  const closeDist = Math.hypot(last.x - first.x, last.y - first.y);
  const isClosed = closeDist < Math.max(20, diag * 0.25);

  if (!isClosed) {
    // open stroke - check if it's basically a straight line
    const straightDist = Math.hypot(last.x - first.x, last.y - first.y);
    const traveled = pathLength(pts);
    if (traveled === 0) return null;
    const straightness = straightDist / traveled;
    if (straightness > 0.92 && straightDist > 24) {
      return {
        tool: "line",
        points: [first.x, first.y, last.x, last.y],
        offsetX: 0,
        offsetY: 0,
      };
    }
    return null;
  }

  // closed stroke - ellipse, triangle, diamond, or rectangle
  const bboxArea = width * height;
  const fillRatio = Math.min(1, polygonArea(pts) / bboxArea);
  const corners = countCorners(pts);

  if (corners <= 2 && fillRatio > 0.62) {
    return { tool: "ellipse", x: minX, y: minY, width, height };
  }
  if (corners === 3 && fillRatio > 0.3 && fillRatio < 0.6) {
    return { tool: "triangle", x: minX, y: minY, width, height };
  }
  if (corners === 4 && fillRatio > 0.35 && fillRatio < 0.6) {
    return { tool: "diamond", x: minX, y: minY, width, height };
  }
  if (corners >= 3 && corners <= 6 && fillRatio > 0.6) {
    return { tool: "rect", x: minX, y: minY, width, height };
  }
  return null; // ambiguous - leave it as freehand
}