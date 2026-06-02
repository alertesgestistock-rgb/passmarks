
import React, { useEffect, useRef, useState, useCallback } from 'react';
import pdfjsLib from '@/lib/pdfjs';

const FETCH_TIMEOUT_MS = 45_000; // 45 s — generous for mobile

export default function PDFViewer({ url, watermark }) {
  const containerRef = useRef(null);
  const pdfRef       = useRef(null);
  const renderRef    = useRef(null);
  const [loading, setLoading]   = useState(true);
  const [progress, setProgress] = useState(0);   // 0-100 download %
  const [phase, setPhase]       = useState('downloading'); // 'downloading' | 'processing'
  const [error, setError]       = useState(null);

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

  // Effect 1: fetch PDF bytes (with timeout + progress) then parse with PDF.js
  useEffect(() => {
    if (!url || typeof url !== 'string') return;
    if (renderRef.current) renderRef.current.value = true;

    setLoading(true);
    setProgress(0);
    setPhase('downloading');
    setError(null);
    pdfRef.current = null;

    const cancelled = { value: false };
    let task = null;

    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    const run = async () => {
      let res;
      try {
        res = await fetch(url, { signal: controller.signal });
      } catch (err) {
        throw err.name === 'AbortError'
          ? new Error('Download timed out — check your connection and try again.')
          : err;
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // Stream response to track download progress
      const contentLength = Number(res.headers.get('Content-Length')) || 0;
      const reader  = res.body.getReader();
      const chunks  = [];
      let received  = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (cancelled.value) return;
        chunks.push(value);
        received += value.length;
        if (contentLength > 0) {
          setProgress(Math.min(99, Math.round((received / contentLength) * 100)));
        }
      }

      if (cancelled.value) return;

      // Assemble chunks into one ArrayBuffer
      const all = new Uint8Array(received);
      let pos = 0;
      for (const chunk of chunks) { all.set(chunk, pos); pos += chunk.length; }

      // Download done — now PDF.js parses (CPU-bound, can be slow on mobile)
      setProgress(100);
      setPhase('processing');

      task = pdfjsLib.getDocument({ data: all.buffer });
      const pdf = await task.promise;

      if (cancelled.value) return;
      pdfRef.current = pdf;
      setLoading(false);
    };

    run().catch(err => {
      if (cancelled.value) return;
      console.error('[PDFViewer] load error:', err);
      setError(err.message || 'Failed to load PDF');
      setLoading(false);
    }).finally(() => clearTimeout(timeoutId));

    return () => {
      cancelled.value = true;
      clearTimeout(timeoutId);
      controller.abort();
      task?.destroy?.();
    };
  }, [url]);

  // Effect 2: render pages once container div is in the DOM
  useEffect(() => {
    if (loading || error || !pdfRef.current) return;
    renderAll(pdfRef.current);
  }, [loading, error, renderAll]);

  if (loading) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
      <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      <span className="text-[12px] text-slate-400 dark:text-[#64748B]">
        {phase === 'processing'
          ? 'Processing PDF…'
          : progress > 0
            ? `Downloading… ${progress}%`
            : 'Loading paper…'}
      </span>
      {phase === 'downloading' && progress > 0 && (
        <div className="w-full max-w-[200px] h-1 bg-slate-200 dark:bg-[#334155] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#22C55E] rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {phase === 'processing' && (
        <div className="w-full max-w-[200px] h-1 bg-slate-200 dark:bg-[#334155] rounded-full overflow-hidden">
          <div className="h-full bg-[#3B82F6] rounded-full animate-pulse" style={{ width: '100%' }} />
        </div>
      )}
      <span className="text-[11px] text-slate-300 dark:text-[#475569]">
        This may take a moment on mobile
      </span>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4">
      <p className="text-[13px] text-red-400">Unable to load paper.</p>
      <p className="text-[11px] text-slate-500 dark:text-[#64748B] text-center">{error}</p>
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
