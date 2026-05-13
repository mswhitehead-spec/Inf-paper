import { useEffect, useRef, useCallback } from 'react';
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

export function usePasteAndDrop({ viewportRef, nodesRef, setLoading }) {
  // Paste handler wired on window
  useEffect(() => {
    async function handlePaste(e) {
      const vp = viewportRef.current;
      const nodesApi = nodesRef.current;
      const items = [...(e.clipboardData?.items || [])];

      const cx = vp.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);

      const pdfItem = items.find(i => i.type === 'application/pdf');
      const imageItem = items.find(i => i.type.startsWith('image/'));
      const textItem = items.find(i => i.type === 'text/plain');

      if (pdfItem) {
        e.preventDefault();
        setLoading(true);
        try {
          const file = pdfItem.getAsFile();
          const pages = await renderPdfToImages(file);
          let y = cx.y;
          for (const page of pages) {
            nodesApi.addNode({
              type: 'image',
              x: cx.x - page.width / 2,
              y,
              width: page.width,
              height: page.height,
              src: page.dataUrl,
              label: 'PDF page',
            });
            y += page.height + 24;
          }
        } finally {
          setLoading(false);
        }
      } else if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        const dataUrl = await fileToDataUrl(file);
        const { width, height } = await getImageDimensions(dataUrl);
        const scale = Math.min(1, Math.min(800 / width, 600 / height));
        nodesApi.addNode({
          type: 'image',
          x: cx.x - (width * scale) / 2,
          y: cx.y - (height * scale) / 2,
          width: width * scale,
          height: height * scale,
          src: dataUrl,
          label: 'Image',
        });
      } else if (textItem) {
        e.preventDefault();
        const text = await new Promise(r => textItem.getAsString(r));
        if (text.trim()) {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    const files = [...e.dataTransfer.files];
    if (!files.length) return;

    const vp = viewportRef.current;
    const nodesApi = nodesRef.current;
    const dropWorld = vp.screenToWorld(e.clientX, e.clientY);
    let offsetY = dropWorld.y;

    for (const file of files) {
      if (file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) {
        setLoading(true);
        try {
          const pages = await renderPdfToImages(file);
          for (const page of pages) {
            nodesApi.addNode({
              type: 'image',
              x: dropWorld.x - page.width / 2,
              y: offsetY,
              width: page.width,
              height: page.height,
              src: page.dataUrl,
              label: `${file.name} - page`,
            });
            offsetY += page.height + 24;
          }
        } finally {
          setLoading(false);
        }
      } else if (file.type.startsWith('image/')) {
        const dataUrl = await fileToDataUrl(file);
        const { width, height } = await getImageDimensions(dataUrl);
        const scale = Math.min(1, Math.min(800 / width, 600 / height));
        const w = width * scale;
        const h = height * scale;
        nodesApi.addNode({
          type: 'image',
          x: dropWorld.x - w / 2,
          y: offsetY,
          width: w,
          height: h,
          src: dataUrl,
          label: file.name || 'Image',
        });
        offsetY += h + 24;
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { handleDragOver, handleDrop };
}
