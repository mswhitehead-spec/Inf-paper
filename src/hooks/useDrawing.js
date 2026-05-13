import { useState, useRef, useCallback } from 'react';
import { uid } from '../utils/uid.js';

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem('inf-paper') || '{}');
  } catch {
    return {};
  }
}

const saved = loadSaved();

export function useDrawing() {
  const [strokes, setStrokes] = useState(saved.strokes || []);

  // Mutable ref for the in-progress stroke — avoids React renders while drawing
  const currentStrokeRef = useRef(null);

  const startStroke = useCallback((wx, wy, color, width, type = 'pen') => {
    const opacity = type === 'highlight' ? 0.35 : 1;
    const actualWidth = type === 'highlight' ? Math.max(width * 5, 18) : width;
    currentStrokeRef.current = {
      id: uid(),
      type,
      points: [{ x: wx, y: wy }],
      color: type === 'highlight' ? color : color,
      width: actualWidth,
      opacity,
    };
  }, []);

  const addPoint = useCallback((wx, wy, zoom = 1) => {
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    const pts = stroke.points;
    const last = pts[pts.length - 1];
    const minDist = 2 / zoom;
    const dx = wx - last.x, dy = wy - last.y;
    if (dx * dx + dy * dy < minDist * minDist) return;
    pts.push({ x: wx, y: wy });
  }, []);

  const endStroke = useCallback(() => {
    const stroke = currentStrokeRef.current;
    if (!stroke) return;
    const committed = { ...stroke, points: [...stroke.points] };
    currentStrokeRef.current = null;
    if (committed.points.length > 0) {
      setStrokes(prev => [...prev, committed]);
    }
  }, []);

  const commitShape = useCallback((shapeStroke) => {
    currentStrokeRef.current = null;
    setStrokes(prev => [...prev, shapeStroke]);
  }, []);

  const eraseNear = useCallback((wx, wy, radius) => {
    const r2 = radius * radius;
    setStrokes(prev =>
      prev.filter(stroke => {
        if (stroke.type === 'rect' || stroke.type === 'ellipse' || stroke.type === 'arrow') {
          const [p1, p2] = stroke.points;
          const cx = (p1.x + p2.x) / 2;
          const cy = (p1.y + p2.y) / 2;
          const dx = cx - wx, dy = cy - wy;
          return dx * dx + dy * dy > r2;
        }
        return !stroke.points.some(p => {
          const dx = p.x - wx, dy = p.y - wy;
          return dx * dx + dy * dy <= r2;
        });
      })
    );
  }, []);

  const setStrokes2 = useCallback((s) => setStrokes(s), []);

  return {
    strokes,
    currentStrokeRef,
    startStroke,
    addPoint,
    endStroke,
    commitShape,
    eraseNear,
    setStrokes: setStrokes2,
  };
}
