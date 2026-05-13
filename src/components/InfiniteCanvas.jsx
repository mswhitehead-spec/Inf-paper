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

  // Mutable interaction state (no React re-renders needed)
  const spaceHeldRef = useRef(false);
  const isPanningRef = useRef(false);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const shapeStartRef = useRef(null);
  const toolRef = useRef(tool);
  toolRef.current = tool;
  const strokeColorRef = useRef(strokeColor);
  strokeColorRef.current = strokeColor;
  const strokeWidthRef = useRef(strokeWidth);
  strokeWidthRef.current = strokeWidth;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // Cursor is the only thing we need React state for
  const [cursor, setCursor] = useState('default');

  // Non-passive wheel listener (passive:false required for e.preventDefault)
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

  // Keyboard: space for pan, tool shortcuts
  useEffect(() => {
    function onKeyDown(e) {
      if (e.target?.contentEditable === 'true') return;
      if (e.code === 'Space') {
        e.preventDefault();
        spaceHeldRef.current = true;
        setCursor('grab');
      }
      // Tool shortcuts
      const shortcuts = { v: 'select', p: 'pen', h: 'highlight', e: 'eraser', t: 'text', r: 'rect', o: 'ellipse', a: 'arrow' };
      const k = e.key.toLowerCase();
      if (shortcuts[k] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        onSetTool(shortcuts[k]);
      }
    }
    function onKeyUp(e) {
      if (e.code === 'Space') {
        spaceHeldRef.current = false;
        if (!isPanningRef.current) {
          updateCursorFromTool(toolRef.current, setCursor);
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

  // Update cursor when tool changes
  useEffect(() => {
    if (!spaceHeldRef.current && !isPanningRef.current) {
      updateCursorFromTool(tool, setCursor);
    }
  }, [tool]);

  // Pointer down
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0 && e.button !== 1) return;
    const t = toolRef.current;

    // Pan: space+left or middle mouse
    if (spaceHeldRef.current || e.button === 1) {
      e.preventDefault();
      isPanningRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      setCursor('grabbing');
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Click on empty canvas → deselect node
    onSelectNode(null);

    const w = screenToWorld(e.clientX, e.clientY);

    if (t === 'pen' || t === 'highlight') {
      drawing.startStroke(w.x, w.y, strokeColorRef.current, strokeWidthRef.current, t);
      // Prepare live path element
      const el = livePathRef.current;
      if (el) {
        const isHL = t === 'highlight';
        el.setAttribute('stroke', strokeColorRef.current);
        el.setAttribute('stroke-width', isHL ? Math.max(strokeWidthRef.current * 5, 18) : strokeWidthRef.current);
        el.setAttribute('opacity', isHL ? '0.35' : '1');
        el.setAttribute('d', '');
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (t === 'eraser') {
      const r = ERASER_SCREEN_RADIUS / zoomRef.current;
      drawing.eraseNear(w.x, w.y, r);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (t === 'text') {
      const id = nodes.addNode({
        type: 'text',
        x: w.x,
        y: w.y,
        width: 300,
        height: 80,
        content: '',
        editing: true,
      });
      onSelectNode(id);
      onSetTool('select');
      return;
    }

    if (t === 'rect' || t === 'ellipse' || t === 'arrow') {
      shapeStartRef.current = { x: w.x, y: w.y, type: t };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }
  }, [drawing, nodes, onSelectNode, onSetTool, screenToWorld]);

  // Pointer move
  const handlePointerMove = useCallback((e) => {
    if (isPanningRef.current) {
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      applyPanDelta(dx, dy);
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const t = toolRef.current;

    if (!(e.buttons & 1)) return; // left button not held

    const w = screenToWorld(e.clientX, e.clientY);

    if (t === 'pen' || t === 'highlight') {
      drawing.addPoint(w.x, w.y, zoomRef.current);
      // Direct DOM update for live stroke
      const el = livePathRef.current;
      if (el && drawing.currentStrokeRef.current) {
        const d = pointsToSvgPath(drawing.currentStrokeRef.current.points);
        el.setAttribute('d', d);
      }
      return;
    }

    if (t === 'eraser') {
      const r = ERASER_SCREEN_RADIUS / zoomRef.current;
      drawing.eraseNear(w.x, w.y, r);
      return;
    }

    if (shapeStartRef.current && (t === 'rect' || t === 'ellipse' || t === 'arrow')) {
      const g = liveShapeRef.current;
      if (g) {
        updateLiveShape(g, shapeStartRef.current, w.x, w.y, strokeColorRef.current, strokeWidthRef.current);
      }
    }
  }, [applyPanDelta, drawing, screenToWorld]);

  // Pointer up
  const handlePointerUp = useCallback((e) => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setCursor(spaceHeldRef.current ? 'grab' : undefined);
      updateCursorFromTool(toolRef.current, setCursor);
      return;
    }

    const t = toolRef.current;

    if (t === 'pen' || t === 'highlight') {
      drawing.endStroke();
      // Clear live path
      const el = livePathRef.current;
      if (el) el.setAttribute('d', '');
      return;
    }

    if (shapeStartRef.current && (t === 'rect' || t === 'ellipse' || t === 'arrow')) {
      const start = shapeStartRef.current;
      const w = screenToWorld(e.clientX, e.clientY);
      const dx = w.x - start.x, dy = w.y - start.y;

      // Only commit if the shape is large enough
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        drawing.commitShape({
          id: uid(),
          type: t,
          points: [{ x: start.x, y: start.y }, { x: w.x, y: w.y }],
          color: strokeColorRef.current,
          width: strokeWidthRef.current,
          opacity: 1,
        });
      }
      // Clear live shape preview
      const g = liveShapeRef.current;
      if (g) while (g.firstChild) g.removeChild(g.firstChild);
      shapeStartRef.current = null;
    }
  }, [drawing, screenToWorld]);

  return (
    <div
      ref={rootRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        cursor,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {/* The infinite world — transformed via pan/zoom */}
      <div
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          willChange: 'transform',
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

function updateCursorFromTool(tool, setCursor) {
  const map = {
    select: 'default',
    pen: 'crosshair',
    highlight: 'crosshair',
    eraser: 'cell',
    text: 'text',
    rect: 'crosshair',
    ellipse: 'crosshair',
    arrow: 'crosshair',
  };
  setCursor(map[tool] || 'default');
}
