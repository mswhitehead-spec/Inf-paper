import { useState, useCallback } from 'react';
import { uid } from '../utils/uid.js';

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem('inf-paper') || '{}');
  } catch {
    return {};
  }
}

const saved = loadSaved();

export function useNodes() {
  const [nodes, setNodes] = useState(saved.nodes || []);

  const addNode = useCallback((node) => {
    const id = uid();
    const newNode = { zIndex: Date.now(), ...node, id };
    setNodes(prev => [...prev, newNode]);
    return id;
  }, []);

  const updateNode = useCallback((id, partial) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...partial } : n));
  }, []);

  const removeNode = useCallback((id) => {
    setNodes(prev => prev.filter(n => n.id !== id));
  }, []);

  const moveNode = useCallback((id, dx, dy) => {
    setNodes(prev =>
      prev.map(n => n.id === id ? { ...n, x: n.x + dx, y: n.y + dy } : n)
    );
  }, []);

  const setNodes2 = useCallback((ns) => setNodes(ns), []);

  return { nodes, addNode, updateNode, removeNode, moveNode, setNodes: setNodes2 };
}
