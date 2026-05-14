import { useRef } from 'react';

const TOOLS = [
  { id: 'select', label: '⬡', title: 'Select (V)' },
  { id: 'pen', label: '✏', title: 'Pen (P)' },
  { id: 'highlight', label: '▌', title: 'Highlighter (H)' },
  { id: 'eraser', label: '◻', title: 'Eraser (E)' },
  { id: 'text', label: 'T', title: 'Text (T)' },
  { id: 'rect', label: '▭', title: 'Rectangle (R)' },
  { id: 'ellipse', label: '⬭', title: 'Ellipse (O)' },
  { id: 'arrow', label: '→', title: 'Arrow (A)' },
];

const btn = (active) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 40,
  height: 40,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 17,
  background: active ? '#e8f0fe' : 'transparent',
  color: active ? '#1a73e8' : '#444',
  fontWeight: active ? 700 : 400,
  transition: 'background 0.1s',
  flexShrink: 0,
});

const sep = {
  width: 1,
  height: 24,
  background: '#e0e0e0',
  margin: '0 4px',
  flexShrink: 0,
};

export default function Toolbar({
  tool, onToolChange,
  strokeColor, onColorChange,
  strokeWidth, onWidthChange,
  panelOpen, onTogglePanel,
  onPickFiles,
  onClearAll,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const files = [...e.target.files];
    e.target.value = ''; // reset so same file can be picked again
    if (files.length && onPickFiles) {
      await onPickFiles(files);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 'max(14px, env(safe-area-inset-top))',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      maxWidth: 'calc(100vw - 24px)',
      background: 'rgba(255,255,255,0.96)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      borderRadius: 14,
      boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
      display: 'flex',
      alignItems: 'center',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 2,
      padding: '6px 10px',
      userSelect: 'none',
    }}>
      {TOOLS.map(t => (
        <button
          key={t.id}
          title={t.title}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onToolChange(t.id)}
          style={btn(tool === t.id)}
        >
          {t.label}
        </button>
      ))}

      <div style={sep} />

      <label
        title="Stroke color"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 36, height: 36,
          cursor: 'pointer',
          flexShrink: 0,
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <span style={{
          width: 24, height: 24,
          borderRadius: '50%',
          background: strokeColor,
          border: '2px solid #e0e0e0',
          display: 'block',
        }} />
        <input
          type="color"
          value={strokeColor}
          onChange={e => onColorChange(e.target.value)}
          style={{
            position: 'absolute',
            opacity: 0,
            width: 0, height: 0,
            pointerEvents: 'none',
          }}
        />
      </label>

      <input
        type="range"
        min={1}
        max={32}
        value={strokeWidth}
        onChange={e => onWidthChange(Number(e.target.value))}
        onPointerDown={(e) => e.stopPropagation()}
        title={`Width: ${strokeWidth}px`}
        style={{ width: 72, cursor: 'pointer', accentColor: '#1a73e8', flexShrink: 0 }}
      />

      <div style={sep} />

      <button
        title="Insert file"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => fileInputRef.current?.click()}
        style={btn(false)}
      >
        +
      </button>

      <button
        title="Content list"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onTogglePanel}
        style={btn(panelOpen)}
      >
        ☰
      </button>

      <button
        title="Clear canvas"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onClearAll}
        style={btn(false)}
      >
        🗑
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
    </div>
  );
}
