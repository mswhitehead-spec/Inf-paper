import { pointsToSvgPath } from '../utils/pathSmoothing.js';

function renderStroke(stroke) {
  if (stroke.type === 'pen' || stroke.type === 'highlight') {
    const d = pointsToSvgPath(stroke.points);
    if (!d) return null;
    return (
      <path
        key={stroke.id}
        d={d}
        stroke={stroke.color}
        strokeWidth={stroke.width}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        fill="none"
        opacity={stroke.opacity}
      />
    );
  }

  if (stroke.type === 'rect') {
    const [p1, p2] = stroke.points;
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);
    return (
      <rect
        key={stroke.id}
        x={x} y={y} width={w} height={h}
        stroke={stroke.color}
        strokeWidth={stroke.width}
        vectorEffect="non-scaling-stroke"
        fill="none"
        opacity={stroke.opacity ?? 1}
      />
    );
  }

  if (stroke.type === 'ellipse') {
    const [p1, p2] = stroke.points;
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const rx = Math.abs(p2.x - p1.x) / 2;
    const ry = Math.abs(p2.y - p1.y) / 2;
    return (
      <ellipse
        key={stroke.id}
        cx={cx} cy={cy} rx={Math.max(0.1, rx)} ry={Math.max(0.1, ry)}
        stroke={stroke.color}
        strokeWidth={stroke.width}
        vectorEffect="non-scaling-stroke"
        fill="none"
        opacity={stroke.opacity ?? 1}
      />
    );
  }

  if (stroke.type === 'arrow') {
    const [p1, p2] = stroke.points;
    const markerId = `ah-${stroke.id}`;
    return (
      <g key={stroke.id} opacity={stroke.opacity ?? 1}>
        <defs>
          <marker
            id={markerId}
            markerWidth="10" markerHeight="7"
            refX="9" refY="3.5"
            orient="auto"
            markerUnits="userSpaceOnUse"
          >
            <polygon points="0 0, 10 3.5, 0 7" fill={stroke.color} />
          </marker>
        </defs>
        <line
          x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
          stroke={stroke.color}
          strokeWidth={stroke.width}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          markerEnd={`url(#${markerId})`}
        />
      </g>
    );
  }

  return null;
}

export default function StrokeLayer({ strokes, livePathRef, liveShapeRef }) {
  return (
    <>
      <svg
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: 0, height: 0,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        {strokes.map(renderStroke)}
      </svg>

      <svg
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: 0, height: 0,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <path
          ref={livePathRef}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          fill="none"
          d=""
        />
      </svg>

      <svg
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: 0, height: 0,
          overflow: 'visible',
          pointerEvents: 'none',
        }}
      >
        <g ref={liveShapeRef} />
      </svg>
    </>
  );
}
