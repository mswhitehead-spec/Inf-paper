import { useState, useRef, useCallback } from 'react';

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem('inf-paper') || '{}');
  } catch {
    return {};
  }
}

const saved = loadSaved();

export function useViewport() {
  const [state, setState] = useState({
    panX: saved.viewport?.panX ?? 0,
    panY: saved.viewport?.panY ?? 0,
    zoom: saved.viewport?.zoom ?? 1,
  });

  // Always-fresh ref for use inside stable callbacks
  const stateRef = useRef(state);
  stateRef.current = state;

  const applyPanDelta = useCallback((dx, dy) => {
    setState(v => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }));
  }, []);

  const applyZoom = useCallback((deltaY, screenX, screenY, deltaMode = 0) => {
    setState(v => {
      let delta = deltaY;
      if (deltaMode === 1) delta *= 20;
      if (deltaMode === 2) delta *= 300;
      const factor = delta < 0 ? 1.1 : 0.9;
      const newZoom = clamp(v.zoom * factor, 0.05, 20);
      const worldX = (screenX - v.panX) / v.zoom;
      const worldY = (screenY - v.panY) / v.zoom;
      return {
        panX: screenX - worldX * newZoom,
        panY: screenY - worldY * newZoom,
        zoom: newZoom,
      };
    });
  }, []);

  const setViewport = useCallback((vp) => {
    setState(vp);
  }, []);

  // Stable function — reads from ref so it's always current
  const screenToWorld = useCallback((sx, sy) => {
    const { panX, panY, zoom } = stateRef.current;
    return { x: (sx - panX) / zoom, y: (sy - panY) / zoom };
  }, []);

  return {
    panX: state.panX,
    panY: state.panY,
    zoom: state.zoom,
    applyPanDelta,
    applyZoom,
    setViewport,
    screenToWorld,
  };
}
