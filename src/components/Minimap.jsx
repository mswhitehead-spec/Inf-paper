import { useRef, useCallback } from 'react';

const MAP_W = 200;
const MAP_H = 140;
const PAD = 40;

function getBounds(strokes, nodes) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const s of strokes) {
    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
  }
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
    const nx2 = n.x + n.width;
    const ny2 = n.y + n.height;
    if (nx2 > maxX) maxX = nx2;
    if (ny2 > maxY) maxY = ny2;
  }

  if (!isFinite(minX)) return { minX: -500, minY: -500, maxX: 500, maxY: 500 };
  return { minX: minX - PAD, minY: minY - PAD, maxX: maxX + PAD, maxY: maxY + PAD };
}

export default function Minimap({ strokes, nodes, viewport }) {
  const { panX, panY, zoom, applyPanDelta } = viewport;
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  if (strokes.length === 0 && nodes.length === 0) return null;

  const bounds = getBounds(strokes, nodes);
  const contentW = bounds.maxX - bounds.minX;
  const contentH = bounds.maxY - bounds.minY;

  if (contentW <= 0 || contentH <= 0) return null;

  const scaleX = MAP_W / contentW;
  const scaleY = MAP_H / contentH;
  const scale = Math.min(scaleX, scaleY);

  // World → minimap coordinate
  function toMap(wx, wy) {
    return {
      x: (wx - bounds.minX) * scale,
      y: (wy - bounds.minY) * scale,
    };
  }

  // Viewport rect in world space
  const vpLeft = -panX / zoom;
  const vpTop = -panY / zoom;
  const vpRight = (window.innerWidth - panX) / zoom;
  const vpBottom = (window.innerHeight - panY) / zoom;

  const vpMapTL = toMap(vpLeft, vpTop);
  const vpMapBR = toMap(vpRight, vpBottom);
  const vpMapW = vpMapBR.x - vpMapTL.x;
  const vpMapH = vpMapBR.y - vpMapTL.y;

  const handlePointerDown = (e) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
    navigateToClick(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - lastPos.current.x) / scale * zoom;
    const dy = (e.clientY - lastPos.current.y) / scale * zoom;
    applyPanDelta(-dx, -dy);
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = () => { isDragging.current = false; };

  function navigateToClick(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const worldX = mx / scale + bounds.minX;
    const worldY = my / scale + bounds.minY;
    // Pan so the clicked world point is at screen center
    viewport.setViewport({
      panX: window.innerWidth / 2 - worldX * zoom,
      panY: window.innerHeight / 2 - worldY * zoom,
      zoom,
    });
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: MAP_W,
        height: MAP_H,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(6px)',
        borderRadius: 10,
        boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
        overflow: 'hidden',
        zIndex: 900,
        cursor: 'crosshair',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <svg width={MAP_W} height={MAP_H} style={{ display: 'block' }}>
        {/* Node bounding boxes */}
        {nodes.map(n => {
          const tl = toMap(n.x, n.y);
          const br = toMap(n.x + n.width, n.y + n.height);
          return (
            <rect
              key={n.id}
              x={tl.x} y={tl.y}
              width={Math.max(1, br.x - tl.x)}
              height={Math.max(1, br.y - tl.y)}
              fill={n.type === 'text' ? '#b3c8f0' : '#c8e6c9'}
              stroke="none"
              rx={1}
            />
          );
        })}

        {/* Stroke dots (sample every few points for perf) */}
        {strokes.map(s => {
          const sample = s.points.filter((_, i) => i % 4 === 0);
          if (sample.length < 2) return null;
          const d = sample.map((p, i) => {
            const m = toMap(p.x, p.y);
            return `${i === 0 ? 'M' : 'L'} ${m.x.toFixed(1)} ${m.y.toFixed(1)}`;
          }).join(' ');
          return (
            <path
              key={s.id}
              d={d}
              stroke={s.color}
              strokeWidth={Math.max(0.5, s.width * scale)}
              fill="none"
              opacity={s.opacity * 0.7}
              strokeLinecap="round"
            />
          );
        })}

        {/* Viewport indicator */}
        <rect
          x={vpMapTL.x} y={vpMapTL.y}
          width={Math.max(4, vpMapW)}
          height={Math.max(4, vpMapH)}
          fill="rgba(26,115,232,0.1)"
          stroke="#1a73e8"
          strokeWidth={1.5}
          rx={2}
        />
      </svg>
    </div>
  );
}
