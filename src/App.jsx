import { useState, useEffect, useRef, useCallback } from 'react';
import { useViewport } from './hooks/useViewport.js';
import { useDrawing } from './hooks/useDrawing.js';
import { useNodes } from './hooks/useNodes.js';
import { usePasteAndDrop } from './hooks/usePasteAndDrop.js';
import Toolbar from './components/Toolbar.jsx';
import InfiniteCanvas from './components/InfiniteCanvas.jsx';
import Minimap from './components/Minimap.jsx';
import ContentPanel from './components/ContentPanel.jsx';

const SAVE_DELAY = 600;

export default function App() {
  const [tool, setTool] = useState('select');
  const [strokeColor, setStrokeColor] = useState('#1a1a1a');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const viewport = useViewport();
  const drawing = useDrawing();
  const nodes = useNodes();

  // Stable refs passed to usePasteAndDrop to avoid stale closures
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const { handleDragOver, handleDrop, handleFiles } = usePasteAndDrop({
    viewportRef,
    nodesRef,
    setLoading,
    setTool,
  });

  // Persist state to localStorage (debounced)
  const saveTimer = useRef(null);
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem('inf-paper', JSON.stringify({
          viewport: { panX: viewport.panX, panY: viewport.panY, zoom: viewport.zoom },
          strokes: drawing.strokes,
          nodes: nodes.nodes,
        }));
      } catch {
        // quota exceeded — ignore
      }
    }, SAVE_DELAY);
    return () => clearTimeout(saveTimer.current);
  }, [viewport.panX, viewport.panY, viewport.zoom, drawing.strokes, nodes.nodes]);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e) => {
      const active = document.activeElement;
      const isEditing =
        active?.contentEditable === 'true' ||
        active?.tagName === 'INPUT' ||
        active?.tagName === 'TEXTAREA';

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId && !isEditing) {
        nodes.removeNode(selectedNodeId);
        setSelectedNodeId(null);
      }
      if (e.key === 'Escape') {
        setSelectedNodeId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedNodeId, nodes]);

  // Animate viewport to a node
  const flyToNode = useCallback((node) => {
    const screenW = window.innerWidth;
    const screenH = window.innerHeight;
    const margin = 0.72;
    const targetZoom = Math.min(
      Math.max(0.01, Math.min(500, (screenW * margin) / Math.max(node.width, 1))),
      Math.max(0.01, Math.min(500, (screenH * margin) / Math.max(node.height, 1)))
    );
    const targetPanX = screenW / 2 - (node.x + node.width / 2) * targetZoom;
    const targetPanY = screenH / 2 - (node.y + node.height / 2) * targetZoom;

    const start = {
      panX: viewportRef.current.panX,
      panY: viewportRef.current.panY,
      zoom: viewportRef.current.zoom,
    };
    const end = { panX: targetPanX, panY: targetPanY, zoom: targetZoom };
    const t0 = performance.now();
    const dur = 340;

    function tick(now) {
      const t = Math.min(1, (now - t0) / dur);
      const e = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
      viewport.setViewport({
        panX: start.panX + (end.panX - start.panX) * e,
        panY: start.panY + (end.panY - start.panY) * e,
        zoom: start.zoom + (end.zoom - start.zoom) * e,
      });
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [viewport]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {panelOpen && (
        <ContentPanel
          nodes={nodes.nodes}
          onFlyTo={flyToNode}
          onClose={() => setPanelOpen(false)}
        />
      )}

      <Toolbar
        tool={tool}
        onToolChange={setTool}
        strokeColor={strokeColor}
        onColorChange={setStrokeColor}
        strokeWidth={strokeWidth}
        onWidthChange={setStrokeWidth}
        panelOpen={panelOpen}
        onTogglePanel={() => setPanelOpen(p => !p)}
        onPickFiles={handleFiles}
        onClearAll={() => {
          if (confirm('Clear everything on the canvas?')) {
            drawing.setStrokes([]);
            nodes.setNodes([]);
            setSelectedNodeId(null);
          }
        }}
      />

      <InfiniteCanvas
        viewport={viewport}
        tool={tool}
        drawing={drawing}
        nodes={nodes}
        strokeColor={strokeColor}
        strokeWidth={strokeWidth}
        selectedNodeId={selectedNodeId}
        onSelectNode={setSelectedNodeId}
        onSetTool={setTool}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

      <Minimap
        strokes={drawing.strokes}
        nodes={nodes.nodes}
        viewport={viewport}
      />

      {loading && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(255,255,255,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 3000, fontSize: 16, color: '#555', gap: 12,
        }}>
          <span style={{ fontSize: 24 }}>⏳</span> Rendering PDF…
        </div>
      )}
    </div>
  );
}
