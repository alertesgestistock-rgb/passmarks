import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
const EF_BASE       = `${SUPABASE_URL}/functions/v1/pdf-pages`;

// ─── Single page component ────────────────────────────────────────────────────

function PDFPage({ pageNum, pdfPath, watermark, token }) {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);
  const fetchedRef   = useRef(false);
  const [state, setState] = useState('idle'); // idle | loading | done | error

  const drawPage = useCallback(async () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setState('loading');

    try {
      const url = `${EF_BASE}?path=${encodeURIComponent(pdfPath)}&page=${pageNum}`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON,
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const blob  = await res.blob();
      const imgUrl = URL.createObjectURL(blob);

      await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          if (!canvas) { resolve(); return; }

          canvas.width  = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');

          // Draw PDF page
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(imgUrl);

          // Draw watermark grid
          if (watermark) {
            ctx.save();
            ctx.globalAlpha = 0.11;
            ctx.fillStyle   = '#334155';
            const fontSize  = Math.max(11, img.naturalWidth * 0.022);
            ctx.font        = `500 ${fontSize}px system-ui, sans-serif`;
            const text      = `PassMark · ${watermark}`;
            const cols = 4, rows = 6;
            const sx = img.naturalWidth  / cols;
            const sy = img.naturalHeight / rows;
            for (let r = 0; r < rows; r++) {
              for (let c = 0; c < cols; c++) {
                ctx.save();
                ctx.translate(sx * c + sx / 2, sy * r + sy / 2);
                ctx.rotate(-Math.PI / 7);
                ctx.fillText(text, -ctx.measureText(text).width / 2, 0);
                ctx.restore();
              }
            }
            ctx.restore();
          }

          resolve();
        };
        img.onerror = reject;
        img.src = imgUrl;
      });

      setState('done');
    } catch (err) {
      console.error(`[PDFViewer] page ${pageNum} error:`, err);
      fetchedRef.current = false; // allow retry
      setState('error');
    }
  }, [pdfPath, pageNum, token, watermark]);

  useEffect(() => {
    if (!token || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) drawPage(); },
      { rootMargin: '400px' },
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [token, drawPage]);

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-[6px] overflow-hidden mb-[6px]"
      style={{ minHeight: state === 'done' ? undefined : '420px' }}
      onContextMenu={e => e.preventDefault()}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', display: state === 'done' ? 'block' : 'none' }}
      />

      {state !== 'done' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          {state === 'loading' && (
            <>
              <div className="w-6 h-6 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-slate-400 dark:text-[#64748B]">Page {pageNum}</span>
            </>
          )}
          {state === 'idle' && (
            <span className="text-[11px] text-slate-300 dark:text-[#475569]">Page {pageNum}</span>
          )}
          {state === 'error' && (
            <button
              onClick={() => { fetchedRef.current = false; setState('idle'); drawPage(); }}
              className="text-[11px] text-red-400 underline"
            >
              Page {pageNum} — retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main viewer ──────────────────────────────────────────────────────────────

export default function PDFViewer({ pdfPath, pdfUrl, watermark }) {
  const [token,    setToken]    = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [status,   setStatus]   = useState('loading'); // loading | ready | not_converted | error

  // Get session token
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.access_token) setToken(session.access_token);
      else setStatus('error');
    });
  }, []);

  // Fetch metadata once we have the token
  useEffect(() => {
    if (!token || !pdfPath) return;

    const url = `${EF_BASE}?path=${encodeURIComponent(pdfPath)}&page=meta`;
    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': SUPABASE_ANON,
      },
    })
      .then(r => r.json())
      .then(data => {
        if (data.numPages) {
          setNumPages(data.numPages);
          setStatus('ready');
        } else {
          setStatus('not_converted');
        }
      })
      .catch(() => setStatus('error'));
  }, [token, pdfPath]);

  // ── States ──────────────────────────────────────────────────────────────────

  if (status === 'loading') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 border-2 border-[#22C55E] border-t-transparent rounded-full animate-spin" />
      <span className="text-[12px] text-slate-400 dark:text-[#64748B]">Loading paper…</span>
    </div>
  );

  if (status === 'not_converted') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-[13px] text-slate-500 dark:text-[#94A3B8]">
        This paper is being prepared for mobile viewing.
      </p>
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-[#22C55E] text-white text-[13px] font-medium"
        >
          Open in browser ↗
        </a>
      )}
    </div>
  );

  if (status === 'error') return (
    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-[13px] text-red-400">Unable to load paper.</p>
      {pdfUrl && (
        <a
          href={pdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#1E293B] text-slate-600 dark:text-[#94A3B8] text-[13px] font-medium"
        >
          Open in browser ↗
        </a>
      )}
    </div>
  );

  // ── Render pages ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2">
      {Array.from({ length: numPages }, (_, i) => (
        <PDFPage
          key={i + 1}
          pageNum={i + 1}
          pdfPath={pdfPath}
          watermark={watermark}
          token={token}
        />
      ))}
    </div>
  );
}
