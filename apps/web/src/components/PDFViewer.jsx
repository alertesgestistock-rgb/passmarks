
import React, { useEffect, useRef, useState, useCallback } from 'react';
import pdfjsLib from '@/lib/pdfjs';

export default function PDFViewer({ url, watermark }) {
  const containerRef = useRef(null);
  const pdfRef       = useRef(null);
  const renderRef    = useRef(null); // cancel flag for renderAll
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  // Render all pages on canvas with watermark
  const renderAll = useCallback(async (pdf) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    container.innerHTML = '';

    const containerWidth = container.clientWidth || 340;
    const cancelled = { value: false };
    renderRef.current = cancelled;

    for (let i = 1; i <= pdf.numPages; i++) {
      if (cancelled.value) break;

      const page     = await pdf.getPage(i);
      const baseView = page.getViewport({ scale: 1 });
      const scale    = containerWidth / baseView.width;
      const viewport = page.getViewport({ scale });

      const canvas    = document.createElement('canvas');
      canvas.width    = viewport.width;
      canvas.height   = viewport.height;
      canvas.style.cssText = 'width:100%;display:block;margin-bottom:6px;border-radius:6px;background:#fff';
      container.appendChild(canvas);

      const ctx = canvas.getContext('2d');
      await page.render({ canvasContext: ctx, viewport }).promise;

      if (cancelled.value) break;

      if (watermark) {
        ctx.save();
        ctx.globalAlpha = 0.11;
        ctx.fillStyle   = '#334155';
        const fontSize  = Math.max(11, viewport.width * 0.022);
        ctx.font        = `500 ${fontSize}px system-ui, sans-serif`;
        const text      = `PassMark · ${watermark}`;
        const cols      = 4;
        const rows      = 6;
        const spacingX  = viewport.width  / cols;
        const spacingY  = viewport.height / rows;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            ctx.save();
            ctx.translate(spacingX * c + spacingX / 2, spacingY * r + spacingY / 2);
            ctx.rotate(-Math.PI / 7);
            ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
            ctx.restore();
          }
        }
        ctx.restore();
      }
    }
  }, [watermark]);

  // Effect 1: fetch PDF bytes and parse with PDF.js
  useEffect(() => {
    if (!url || typeof url !== 'string') return;
    if (renderRef.current) renderRef.current.value = true;

    setLoading(true);
    setError(null);
    pdfRef.current = null;

    const cancelled = { value: false };
    let task = null;

    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.arrayBuffer();
      })
      .then(data => {
        if (cancelled.value) return;
        task = pdfjsLib.getDocument({ data });
        return task.promise;
      })
      .then(pdf => {
        if (cancelled.value) return;
        pdfRef.current = pdf;
        setLoading(false); // triggers re-render → container div mounts → Effect 2 runs
      })
      .catch(err => {
        if (cancelled.value) return;
        console.error('[PDFViewer] load error:', err);
        setError(err.message || 'Failed to load PDF');
        setLoading(false);
      });

    return () => {
      cancelled.value = true;
      task?.destroy?.();
    };
  }, [url]);

  // Effect 2: render pages once the container div is in the DOM (loading = false)
  useEffect(() => {
    if (loading || error || !pdfRef.current) return;
    renderAll(pdfRef.current);
  }, [loading, error, renderAll]);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      <span className="text-[12px] text-slate-400 dark:text-[#64748B]">Loading paper...</span>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
      <p className="text-[13px] text-red-400">Unable to load paper.</p>
      <p className="text-[11px] text-slate-500 text-center">{error}</p>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto overflow-x-hidden p-2"
      style={{ WebkitOverflowScrolling: 'touch' }}
      onContextMenu={e => e.preventDefault()}
    />
  );
}
