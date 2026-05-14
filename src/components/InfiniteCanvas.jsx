import { useRef, useEffect, useState, useCallback } from 'react';
import { pointsToSvgPath } from '../utils/pathSmoothing.js';
import { uid } from '../utils/uid.js';
import StrokeLayer from './StrokeLayer.jsx';
import NodesLayer from './NodesLayer.jsx';

const ERASER_SCREEN_RADIUS = 22;

function svgNS(tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function updateLiveShape(gEl, shapeStart, wx, wy, color, width) {
  while (gEl.firstChild) gEl.removeChild(gEl.firstChild);
  if (!shapeStart) return;
  const { x: x1, y: y1, type } = shapeStart;
  const x2 = wx, y2 = wy;

  if (type === 'rect') {
    const el = svgNS('rect');
    el.setAttribute('x', Math.min(x1, x2));
    el.setAttribute('y', Math.min(y1, y2));
    el.setAttribute('width', Math.abs(x2 - x1));
    el.setAttribute('height', Math.abs(y2 - y1));
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', width);
    el.setAttribute('fill', 'none');
    gEl.appendChild(el);
    return;
  }

  if (type === 'ellipse') {
    const el = svgNS('ellipse');
    el.setAttribute('cx', (x1 + x2) / 2);
    el.setAttribute('cy', (y1 + y2) / 2);
    el.setAttribute('rx', Math.max(0.1, Math.abs(x2 - x1) / 2));
    el.setAttribute('ry', Math.max(0.1, Math.abs(y2 - y1) / 2));
    el.setAttribute('stroke', color);
    el.setAttribute('stroke-width', width);
    el.setAttribute('fill', 'none');
    gEl.appendChild(el);
    return;
  }

  if (type === 'arrow') {
    const markerId = 'live-arrow-marker';
    const defs = svgNS('defs');
    const marker = svgNS('marker');
    marker.setAttribute('id', markerId);
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    const poly = svgNS('polygon');
    poly.setAttribute('points', '0 0, 10 3.5, 0 7');
    poly.setAttribute('fill', color);
    marker.appendChild(poly);
    defs.appendChild(marker);
    gEl.appendChild(defs);

    const line = svgNS('line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', width);
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('marker-end', `url(#${markerId})`);
    gEl.appendChild(line);
  }
}

const TOOL_CURSORS = {
  select: 'default',
  pen: 'crosshair',
  highlight: 'crosshair',
  eraser: 'cell',
  text: 'text',
  rect: 'crosshair',
  ellipse: 'crosshair',
  arrow: 'crosshair',
};

export default function InfiniteCanvas({
  viewport,
  tool,
  drawing,
  nodes,
  strokeColor,
  strokeWidth,
  selectedNodeId,
  onSelectNode,
  onSetTool,
  onDragOver,
  onDrop,
}) {
  const { panX, panY, zoom, applyPanDelta, applyZoom, screenToWorld, setViewport } = viewport;

  const rootRef = useRef(null);
  const livePathRef = useRef(null);
  const liveShapeRef = useRef(null);

  // Refs for always-fresh values inside stable callbacks
  const toolRef = useRef(tool); toolRef.current = tool;
  const strokeColorRef = useRef(strokeColor); strokeColorRef.current = strokeColor;
  const strokeWidthRef = useRef(strokeWidth); strokeWidthRef.current = strokeWidth;
  const zoomRef = useRef(zoom); zoomRef.current = zoom;
  const panXRef = useRef(panX); panXRef.current = panX;
  const panYRef = useRef(panY); panYRef.current = panY;

  // Multi-touch state
  const pointersRef = useRef(new Map()); // pointerId → {x, y, type}
  const pinchRef = useRef(null);          // { distance, cx, cy } or null
  const actionRef = useRef(null);         // 'pan' | 'pen' | 'shape' | 'eraser' | null
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const shapeStartRef = useRef(null);
  const spaceHeldRef = useRef(false);

  const [cursor, setCursor] = useState('default');

  // Cancel whatever single-pointer action is in progress.
  const cancelSingleAction = useCallback(() => {
    if (actionRef.current === 'pen') {
      drawing.cancelStroke();
      if (livePathRef.current) livePathRef.current.setAttribute('d', '');
    } else if (actionRef.current === 'shape') {
      shapeStartRef.current = null;
      const g = liveShapeRef.current;
      if (g) while (g.firstChild) g.removeChild(g.firstChild);
    }
    actionRef.current = null;
  }, [drawing]);

  // Begin a single-pointer action based on the current tool.
  const startSingleAction = useCallback((e) => {
    const t = toolRef.current;

    // Pan: space+left or middle button or mouse with no tool intent
    if (spaceHeldRef.current || e.button === 1) {
      actionRef.current = 'pan';
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setCursor('grabbing');
      return;
    }

    // Deselect any node when clicking empty canvas
    onSelectNode(null);

    const w = screenToWorld(e.clientX, e.clientY);

    if (t === 'pen' || t === 'highlight') {
      const isHL = t === 'highlight';
      const screenW = strokeWidthRef.current;
      const worldW = isHL
        ? Math.max(screenW * 5, 18) / zoomRef.current
        : screenW / zoomRef.current;
      drawing.startStroke(w.x, w.y, strokeColorRef.current, worldW, t);
      const el = livePathRef.current;
      if (el) {
        el.setAttribute('stroke', strokeColorRef.current);
        el.setAttribute('stroke-width', worldW);
        el.setAttribute('opacity', isHL ? '0.35' : '1');
        el.setAttribute('d', '');
      }
      actionRef.current = 'pen';
      return;
    }

    if (t === 'eraser') {
      const r = ERASER_SCREEN_RADIUS / zoomRef.current;
      drawing.eraseNear(w.x, w.y, r);
      actionRef.current = 'eraser';
      return;
    }

    if (t === 'text') {
      const id = nodes.addNode({
        type: 'text', x: w.x, y: w.y,
        width: 300, height: 80,
        content: '', editing: true,
      });
      onSelectNode(id);
      onSetTool('select');
      actionRef.current = null;
      return;
    }

    if (t === 'rect' || t === 'ellipse' || t === 'arrow') {
      shapeStartRef.current = { x: w.x, y: w.y, type: t };
      actionRef.current = 'shape';
      return;
    }
  }, [drawing, nodes, onSelectNode, onSetTool, screenToWorld]);

  // Continue a single-pointer action.
  const continueSingleAction = useCallback((e) => {
    if (actionRef.current === 'pan') {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      applyPanDelta(dx, dy);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const w = screenToWorld(e.clientX, e.clientY);

    if (actionRef.current === 'pen') {
      drawing.addPoint(w.x, w.y, zoomRef.current);
      const el = livePathRef.current;
      if (el && drawing.currentStrokeRef.current) {
        el.setAttribute('d', pointsToSvgPath(drawing.currentStrokeRef.current.points));
      }
      return;
    }

    if (actionRef.current === 'eraser') {
      drawing.eraseNear(w.x, w.y, ERASER_SCREEN_RADIUS / zoomRef.current);
      return;
    }

    if (actionRef.current === 'shape' && shapeStartRef.current) {
      const g = liveShapeRef.current;
      if (g) updateLiveShape(g, shapeStartRef.current, w.x, w.y, strokeColorRef.current, strokeWidthRef.current / zoomRef.current);
    }
  }, [applyPanDelta, drawing, screenToWorld]);

  // Finalize a single-pointer action.
  const endSingleAction = useCallback((e) => {
    const action = actionRef.current;

    if (action === 'pan') {
      setCursor(spaceHeldRef.current ? 'grab' : (TOOL_CURSORS[toolRef.current] || 'default'));
    } else if (action === 'pen') {
      drawing.endStroke();
      if (livePathRef.current) livePathRef.current.setAttribute('d', '');
    } else if (action === 'shape' && shapeStartRef.current) {
      const start = shapeStartRef.current;
      const w = screenToWorld(e.clientX, e.clientY);
      if (Math.abs(w.x - start.x) > 2 || Math.abs(w.y - start.y) > 2) {
        drawing.commitShape({
          id: uid(),
          type: start.type,
          points: [{ x: start.x, y: start.y }, { x: w.x, y: w.y }],
          color: strokeColorRef.current,
          width: strokeWidthRef.current / zoomRef.current,
          opacity: 1,
        });
      }
      const g = liveShapeRef.current;
      if (g) while (g.firstChild) g.removeChild(g.firstChild);
      shapeStartRef.current = null;
    }

    actionRef.current = null;
  }, [drawing, screenToWorld]);

  // ─── Pointer event handlers ───────────────────────────────────────────────

  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0 && e.button !== 1 && e.pointerType !== 'touch' && e.pointerType !== 'pen') return;

    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }

    const count = pointersRef.current.size;

    if (count === 1) {
      startSingleAction(e);
    } else if (count === 2) {
      cancelSingleAction();
      const [p1, p2] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.hypot(p2.x - p1.x, p2.y - p1.y),
        cx: (p1.x + p2.x) / 2,
        cy: (p1.y + p2.y) / 2,
        // Snapshot the viewport state at pinch start, then update locally each move
        // (avoids the 1-frame lag between setViewport and ref updates)
        panX: panXRef.current,
        panY: panYRef.current,
        zoom: zoomRef.current,
      };
    }
    // ≥3 pointers: ignored (already in pinch mode)
  }, [startSingleAction, cancelSingleAction]);

  const handlePointerMove = useCallback((e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, type: e.pointerType });

    const count = pointersRef.current.size;

    if (count >= 2 && pinchRef.current) {
      const pts = [...pointersRef.current.values()].slice(0, 2);
      const [p1, p2] = pts;
      const newDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      const newCx = (p1.x + p2.x) / 2;
      const newCy = (p1.y + p2.y) / 2;

      const { distance: oldDist, cx: oldCx, cy: oldCy, panX: oldPanX, panY: oldPanY, zoom: oldZoom } = pinchRef.current;

      const zoomFactor = newDist / Math.max(oldDist, 1);
      const newZoom = Math.min(5000, Math.max(0.01, oldZoom * zoomFactor));
      const effectiveFactor = newZoom / oldZoom;
      // Anchor world-point at old finger-midpoint to new finger-midpoint
      const newPanX = newCx - (oldCx - oldPanX) * effectiveFactor;
      const newPanY = newCy - (oldCy - oldPanY) * effectiveFactor;

      setViewport({ panX: newPanX, panY: newPanY, zoom: newZoom });

      pinchRef.current = {
        distance: newDist, cx: newCx, cy: newCy,
        panX: newPanX, panY: newPanY, zoom: newZoom,
      };
      return;
    }

    if (count === 1 && actionRef.current) {
      continueSingleAction(e);
    }
  }, [continueSingleAction, setViewport]);

  const handlePointerUp = useCallback((e) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.delete(e.pointerId);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }

    const count = pointersRef.current.size;

    if (count === 0) {
      if (actionRef.current) endSingleAction(e);
      pinchRef.current = null;
    } else if (count === 1) {
      // End pinch; don't resume single-pointer action until all fingers lift
      pinchRef.current = null;
    }
  }, [endSingleAction]);

  // ─── Wheel + keyboard ─────────────────────────────────────────────────────

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    function onWheel(e) {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        applyZoom(e.deltaY, e.clientX, e.clientY, e.deltaMode);
      } else {
        applyPanDelta(-e.deltaX, -e.deltaY);
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [applyZoom, applyPanDelta]);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.target?.contentEditable === 'true') return;
      if (e.code === 'Space') {
        e.preventDefault();
        spaceHeldRef.current = true;
        setCursor('grab');
      }
      const shortcuts = { v: 'select', p: 'pen', h: 'highlight', e: 'eraser', t: 'text', r: 'rect', o: 'ellipse', a: 'arrow' };
      const k = e.key.toLowerCase();
      if (shortcuts[k] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        onSetTool(shortcuts[k]);
      }
    }
    function onKeyUp(e) {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
        if (actionRef.current !== 'pan') {
          setCursor(TOOL_CURSORS[toolRef.current] || 'default');
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [onSetTool]);

  useEffect(() => {
    if (!spaceHeldRef.current && actionRef.current !== 'pan') {
      setCursor(TOOL_CURSORS[tool] || 'default');
    }
  }, [tool]);

  return (
    <div
      ref={rootRef}
      className="canvas-root"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor,
        touchAction: 'none',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
        }}
      >
        <StrokeLayer
          strokes={drawing.strokes}
          livePathRef={livePathRef}
          liveShapeRef={liveShapeRef}
        />
        <NodesLayer
          nodes={nodes.nodes}
          tool={tool}
          selectedNodeId={selectedNodeId}
          onSelectNode={onSelectNode}
          onUpdateNode={nodes.updateNode}
          zoom={zoom}
        />
      </div>
    </div>
  );
}
