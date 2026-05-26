import { useRef, useLayoutEffect, useCallback } from 'react';

export default function TextNode({ node, tool, selected, onUpdate, onSelect, zoom }) {
  const divRef = useRef(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ cx: 0, cy: 0, nx: 0, ny: 0 });

  // Sync innerText ↔ node.content without React touching children
  useLayoutEffect(() => {
    if (!divRef.current || node.editing) return;
    divRef.current.innerText = node.content || '';
  }, [node.content, node.editing]);

  // When editing starts: initialize innerText and focus
  useLayoutEffect(() => {
    if (!divRef.current || !node.editing) return;
    divRef.current.innerText = node.content || '';
    divRef.current.focus();
    const range = document.createRange();
    range.selectNodeContents(divRef.current);
    range.collapse(false);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
  }, [node.editing]); // intentionally omit node.content to not clobber typing

  const handlePointerDown = useCallback((e) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    onSelect();

    if (!node.editing) {
      isDragging.current = true;
      dragStart.current = { cx: e.clientX, cy: e.clientY, nx: node.x, ny: node.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [tool, node.editing, node.x, node.y, onSelect]);

  const handlePointerMove = useCallback((e) => {
    if (!isDragging.current) return;
    const dx = (e.clientX - dragStart.current.cx) / zoom;
    const dy = (e.clientY - dragStart.current.cy) / zoom;
    onUpdate({ x: dragStart.current.nx + dx, y: dragStart.current.ny + dy });
  }, [zoom, onUpdate]);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleDoubleClick = useCallback((e) => {
    if (tool !== 'select') return;
    e.stopPropagation();
    isDragging.current = false;
    onUpdate({ editing: true });
  }, [tool, onUpdate]);

  const handleBlur = useCallback(() => {
    if (divRef.current) {
      onUpdate({ editing: false, content: divRef.current.innerText });
    }
  }, [onUpdate]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') { divRef.current?.blur(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '    ');
    }
    e.stopPropagation();
  }, []);

  const isSelect = tool === 'select';

  return (
    <div
      ref={divRef}
      contentEditable={node.editing || undefined}
      suppressContentEditableWarning
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      onBlur={handleBlur}
      onKeyDown={node.editing ? handleKeyDown : undefined}
      style={{
        position: 'absolute',
        left: node.x,
        top: node.y,
        minWidth: 80,
        width: node.width,
        minHeight: 24,
        pointerEvents: isSelect ? 'auto' : 'none',
        touchAction: node.editing ? 'auto' : 'none',
        cursor: isSelect && !node.editing ? 'grab' : isSelect ? 'text' : 'default',
        userSelect: node.editing ? 'text' : 'none',
        outline: node.editing
          ? '2px solid #1a73e8'
          : selected
          ? '1.5px solid #1a73e8'
          : 'none',
        outlineOffset: 3,
        borderRadius: 4,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: 16,
        lineHeight: 1.55,
        padding: '4px 6px',
        color: '#1a1a1a',
        background: node.editing ? 'rgba(255,255,255,0.95)' : 'transparent',
      }}
    />
  );
}
