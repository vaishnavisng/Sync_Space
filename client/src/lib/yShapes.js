import * as Y from "yjs";

export function getShapesArray(ydoc) {
  return ydoc.getArray("shapes");
}

export function addShape(shapesArray, shape) {
  shapesArray.push([shape]);
}

export function updateLastShape(shapesArray, patch) {
  const len = shapesArray.length;
  if (len === 0) return;
  const last = shapesArray.get(len - 1);
  shapesArray.delete(len - 1, 1);
  shapesArray.push([{ ...last, ...patch }]);
}

// Updates a shape wherever it sits in the array (delete+reinsert at the
// same index) so moving/editing a shape doesn't change its draw/z-order —
// unlike updateLastShape, which only ever touches the newest entry.
export function updateShapeById(shapesArray, id, patch) {
  const arr = shapesArray.toArray();
  const idx = arr.findIndex((s) => s.id === id);
  if (idx === -1) return;
  const current = arr[idx];
  shapesArray.delete(idx, 1);
  shapesArray.insert(idx, [{ ...current, ...patch }]);
}

export function clearShapes(shapesArray) {
  shapesArray.delete(0, shapesArray.length);
}

export function createUndoManager(shapesArray) {
  return new Y.UndoManager(shapesArray, { captureTimeout: 300 });
}

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;
  let t = lengthSq === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / lengthSq;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx, projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

function hitTestWholeShape(shape, x, y, radius) {
  const ox = shape.offsetX || 0, oy = shape.offsetY || 0;
  switch (shape.tool) {
    case "rect":
      return x >= shape.x - radius && x <= shape.x + shape.width + radius &&
             y >= shape.y - radius && y <= shape.y + shape.height + radius;
    case "triangle":
    case "diamond":
      return x >= shape.x - radius && x <= shape.x + shape.width + radius &&
            y >= shape.y - radius && y <= shape.y + shape.height + radius;
    case "ellipse": {
      const cx = shape.x + shape.width / 2, cy = shape.y + shape.height / 2;
      const rx = shape.width / 2 + radius, ry = shape.height / 2 + radius;
      if (rx <= 0 || ry <= 0) return false;
      const nx = (x - cx) / rx, ny = (y - cy) / ry;
      return nx * nx + ny * ny <= 1;
    }
    case "text": {
      const w = (shape.text?.length || 1) * (shape.fontSize || 18) * 0.6;
      const h = (shape.fontSize || 18) * 1.2;
      return x >= shape.x - radius && x <= shape.x + w + radius &&
             y >= shape.y - radius && y <= shape.y + h + radius;
    }
    case "arrow": {
      const pts = shape.points || [];
      for (let i = 0; i < pts.length - 2; i += 2) {
        const x1 = pts[i] + ox, y1 = pts[i + 1] + oy;
        const x2 = pts[i + 2] + ox, y2 = pts[i + 3] + oy;
        if (distToSegment(x, y, x1, y1, x2, y2) <= radius) return true;
      }
    return false;
    }

    case "line": {
      const pts = shape.points || [];
      for (let i = 0; i < pts.length - 2; i += 2) {
        const x1 = pts[i] + ox, y1 = pts[i + 1] + oy;
        const x2 = pts[i + 2] + ox, y2 = pts[i + 3] + oy;
        if (distToSegment(x, y, x1, y1, x2, y2) <= radius) return true;
      }
      return false;
    }

    default:
      return false;
  }
}

export function eraseAtPoint(shapesArray, x, y, radius) {
  const doc = shapesArray.doc;
  const arr = shapesArray.toArray();
  const toDeleteIdx = [];
  const toInsert = [];

  arr.forEach((s, idx) => {
    if (s.tool === "pen") {
      const ox = s.offsetX || 0, oy = s.offsetY || 0;
      const pts = s.points || [];
      const segments = [];
      let current = [];

      for (let i = 0; i < pts.length; i += 2) {
        const px = pts[i] + ox, py = pts[i + 1] + oy;
        const hit = Math.hypot(px - x, py - y) <= radius;
        if (hit) {
          if (current.length >= 4) segments.push(current);
          current = [];
        } else {
          current.push(pts[i], pts[i + 1]);
        }
      }
      if (current.length >= 4) segments.push(current);

      const unchanged = segments.length === 1 && segments[0].length === pts.length;
      if (!unchanged) {
        toDeleteIdx.push(idx);
        segments.forEach((segPts) => {
          toInsert.push({ ...s, id: `${s.id}_${Math.random().toString(36).slice(2, 6)}`, points: segPts });
        });
      }
    } else if (hitTestWholeShape(s, x, y, radius)) {
      toDeleteIdx.push(idx);
    }
  });

  if (toDeleteIdx.length === 0) return;

  doc.transact(() => {
    toDeleteIdx.sort((a, b) => b - a).forEach((idx) => shapesArray.delete(idx, 1));
    if (toInsert.length) shapesArray.push(toInsert);
  });
}