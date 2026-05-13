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
  width: 34,
  height: 34,
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: active ? 17 : 16,
  background: active ? '#e8f0fe' : 'transparent',
  color: active ? '#1a73e8' : '#444',
  fontWeight: active ? 700 : 400,
  transition: 'background 0.1s',
});

const sep = {
  width: 1,
  height: 24,
  background: '#e0e0e0',
  margin: '0 4px',
};

export default function Toolbar({
  tool, onToolChange,
  strokeColor, onColorChange,
  strokeWidth, onWidthChange,
  panelOpen, onTogglePanel,
  onClearAll,
}) {
  return (
    <div style={{
      position: 'fixed',
      top: 14,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 1000,
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(8px)',
      borderRadius: 14,
      boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      padding: '6px 10px',
      userSelect: 'none',
    }}>
      {TOOLS.map(t => (
        <button
          key={t.id}
          title={t.title}
          onClick={() => onToolChange(t.id)}
          style={btn(tool === t.id)}
        >
          {t.label}
        </button>
      ))}

      <div style={sep} />

      <input
        type="color"
        value={strokeColor}
        onChange={e => onColorChange(e.target.value)}
        title="Stroke color"
        style={{
          width: 28, height: 28,
          border: '2px solid #e0e0e0',
          borderRadius: 50,
          cursor: 'pointer',
          padding: 0,
          background: 'none',
        }}
      />

      <input
        type="range"
        min={1}
        max={32}
        value={strokeWidth}
        onChange={e => onWidthChange(Number(e.target.value))}
        title={`Width: ${strokeWidth}px`}
        style={{ width: 72, cursor: 'pointer', accentColor: '#1a73e8' }}
      />

      <div style={sep} />

      <button
        title="Content list"
        onClick={onTogglePanel}
        style={btn(panelOpen)}
      >
        ☰
      </button>

      <button
        title="Clear canvas"
        onClick={onClearAll}
        style={btn(false)}
      >
        🗑
      </button>
    </div>
  );
}
