import { useEffect, useCallback } from 'react';
import { renderPdfToImages } from '../utils/pdfRenderer.js';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(dataUrl) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = dataUrl;
  });
}

async function processFile(file, ctx) {
  const { worldX, offsetY, nodesApi, setLoading } = ctx;

  if (file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
    setLoading(true);
    try {
      const pages = await renderPdfToImages(file);
      let y = offsetY;
      for (const page of pages) {
        nodesApi.addNode({
          type: 'image',
          x: worldX - page.width / 2,
          y,
          width: page.width,
          height: page.height,
          src: page.dataUrl,
          label: `${file.name || 'PDF'} - page`,
        });
        y += page.height + 24;
      }
      return y;
    } finally {
      setLoading(false);
    }
  }

  if (file.type.startsWith('image/')) {
    const dataUrl = await fileToDataUrl(file);
    const { width, height } = await getImageDimensions(dataUrl);
    const scale = Math.min(1, Math.min(800 / width, 600 / height));
    const w = width * scale;
    const h = height * scale;
    nodesApi.addNode({
      type: 'image',
      x: worldX - w / 2,
      y: offsetY,
      width: w,
      height: h,
      src: dataUrl,
      label: file.name || 'Image',
    });
    return offsetY + h + 24;
  }

  return offsetY;
}

export function usePasteAndDrop({ viewportRef, nodesRef, setLoading, setTool }) {
  // Centralized file processor — used by paste, drop, and file picker
  const handleFiles = useCallback(async (files, screenX, screenY) => {
    if (!files?.length) return;
    const vp = viewportRef.current;
    const nodesApi = nodesRef.current;
    const sx = screenX ?? window.innerWidth / 2;
    const sy = screenY ?? window.innerHeight / 2;
    const w = vp.screenToWorld(sx, sy);
    let offsetY = w.y;
    let addedAny = false;
    for (const file of files) {
      const newY = await processFile(file, { worldX: w.x, offsetY, nodesApi, setLoading });
      if (newY !== offsetY) addedAny = true;
      offsetY = newY;
    }
    if (addedAny) setTool?.('select');
  }, [viewportRef, nodesRef, setLoading, setTool]);

  // Window paste handler
  useEffect(() => {
    async function handlePaste(e) {
      const vp = viewportRef.current;
      const nodesApi = nodesRef.current;
      const items = [...(e.clipboardData?.items || [])];
      const files = [...(e.clipboardData?.files || [])];

      const fileToProcess = files.find(f =>
        f.type === 'application/pdf' || f.type.startsWith('image/')
      );

      if (fileToProcess) {
        e.preventDefault();
        await handleFiles([fileToProcess]);
        return;
      }

      const textItem = items.find(i => i.type === 'text/plain');
      if (textItem) {
        e.preventDefault();
        const text = await new Promise(r => textItem.getAsString(r));
        if (text.trim()) {
          const cx = vp.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
          nodesApi.addNode({
            type: 'text',
            x: cx.x,
            y: cx.y,
            width: 420,
            height: 120,
            content: text.trim(),
            editing: false,
          });
        }
      }
    }

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleFiles, viewportRef, nodesRef]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (!files.length) return;
    await handleFiles(files, e.clientX, e.clientY);
  }, [handleFiles]);

  return { handleDragOver, handleDrop, handleFiles };
}
