import { useRef, useCallback } from 'react';

const HANDLE_SIZE = 10;

const handlePositions = [
  { id: 'se', cursor: 'se-resize', style: { bottom: -5, right: -5 } },
  { id: 'sw', cursor: 'sw-resize', style: { bottom: -5, left: -5 } },
  { id: 'ne', cursor: 'ne-resize', style: { top: -5, right: -5 } },
  { id: 'nw', cursor: 'nw-resize', style: { top: -5, left: -5 } },
];

export default function ImageNode({ node, tool, selected, onUpdate, onSelect, zoom }) {
  const isDragging = useRef(false);
  const isResizing = useRef(null); // handle id
  const dragStart = useRef({});

  const handlePointerDown = useCallback((e) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    onSelect();
    isDragging.current = true;
    dragStart.current = {
      cx: e.clientX, cy: e.clientY,
      nx: node.x, ny: node.y,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }, [tool, node.x, node.y, onSelect]);

  const handlePointerMove = useCallback((e) => {
    if (isResizing.current) {
      const id = isResizing.current;
      const dx = (e.clientX - dragStart.current.cx) / zoom;
      const dy = (e.clientY - dragStart.current.cy) / zoom;
      const { ox, oy, ow, oh } = dragStart.current;

      let x = ox, y = oy, w = ow, h = oh;
      if (id.includes('e')) { w = Math.max(20, ow + dx); }
      if (id.includes('s')) { h = Math.max(20, oh + dy); }
      if (id.includes('w')) { x = ox + dx; w = Math.max(20, ow - dx); }
      if (id.includes('n')) { y = oy + dy; h = Math.max(20, oh - dy); }
      onUpdate({ x, y, width: w, height: h });
      return;
    }
    if (!isDragging.current) return;
    const dx = (e.clientX - dragStart.current.cx) / zoom;
    const dy = (e.clientY - dragStart.current.cy) / zoom;
    onUpdate({
      x: dragStart.current.nx + dx,
      y: dragStart.current.ny + dy,
    });
  }, [zoom, onUpdate]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    isResizing.current = null;
  }, []);

  const handleResizeDown = useCallback((e, handleId) => {
    e.stopPropagation();
    isResizing.current = handleId;
    isDragging.current = false;
    dragStart.current = {
      cx: e.clientX, cy: e.clientY,
      ox: node.x, oy: node.y,
      ow: node.width, oh: node.height,
    };
    e.currentTarget.closest('[data-node]').setPointerCapture(e.pointerId);
  }, [node.x, node.y, node.width, node.height]);

  const isSelect = tool === 'select';

  return (
    <div
      data-node
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        pointerEvents: isSelect ? 'auto' : 'none',
        touchAction: 'none',
        cursor: isSelect ? 'grab' : 'default',
        outline: selected ? '1.5px solid #1a73e8' : 'none',
        outlineOffset: 2,
        borderRadius: 2,
      }}
    >
      <img
        src={node.src}
        alt={node.label || 'Image'}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          objectFit: 'fill',
          userSelect: 'none',
          pointerEvents: 'none',
          borderRadius: 2,
        }}
        draggable={false}
      />

      {isSelect && selected && handlePositions.map(h => (
        <div
          key={h.id}
          onPointerDown={(e) => handleResizeDown(e, h.id)}
          style={{
            position: 'absolute',
            width: HANDLE_SIZE,
            height: HANDLE_SIZE,
            background: '#1a73e8',
            border: '2px solid white',
            borderRadius: '50%',
            cursor: h.cursor,
            zIndex: 10,
            ...h.style,
          }}
        />
      ))}
    </div>
  );
}
