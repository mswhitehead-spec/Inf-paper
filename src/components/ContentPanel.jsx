export default function ContentPanel({ nodes, onFlyTo, onClose }) {
  const textNodes = nodes.filter(n => n.type === 'text');
  const imageNodes = nodes.filter(n => n.type !== 'text');

  return (
    <div style={{
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      width: 260,
      background: 'rgba(255,255,255,0.97)',
      backdropFilter: 'blur(8px)',
      boxShadow: '2px 0 16px rgba(0,0,0,0.1)',
      zIndex: 950,
      display: 'flex',
      flexDirection: 'column',
      fontSize: 14,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1px solid #e8e8e8',
        fontWeight: 600,
        color: '#333',
      }}>
        <span>Content ({nodes.length})</span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 18,
            cursor: 'pointer',
            color: '#888',
            lineHeight: 1,
            padding: '2px 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* List */}
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px 0' }}>
        {nodes.length === 0 && (
          <div style={{ padding: '20px 16px', color: '#aaa', textAlign: 'center' }}>
            Nothing on the canvas yet
          </div>
        )}

        {textNodes.length > 0 && (
          <div style={{ padding: '4px 12px 2px', color: '#999', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Text
          </div>
        )}
        {textNodes.map(n => (
          <button
            key={n.id}
            onClick={() => onFlyTo(n)}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              width: '100%',
              padding: '8px 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
              borderRadius: 0,
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <span style={{ fontSize: 18, lineHeight: 1, color: '#1a73e8', flexShrink: 0 }}>T</span>
            <span style={{
              color: '#333',
              fontSize: 13,
              lineHeight: 1.4,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {n.content || <em style={{ color: '#bbb' }}>Empty</em>}
            </span>
          </button>
        ))}

        {imageNodes.length > 0 && (
          <div style={{ padding: '8px 12px 2px', color: '#999', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Images & PDFs
          </div>
        )}
        {imageNodes.map(n => (
          <button
            key={n.id}
            onClick={() => onFlyTo(n)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              padding: '6px 14px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              textAlign: 'left',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <img
              src={n.src}
              alt=""
              style={{
                width: 40,
                height: 32,
                objectFit: 'cover',
                borderRadius: 4,
                border: '1px solid #e0e0e0',
                flexShrink: 0,
              }}
            />
            <span style={{ color: '#333', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {n.label || `${Math.round(n.width)}×${Math.round(n.height)}`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
