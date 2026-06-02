import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import * as pdfjsLib from 'npm:pdfjs-dist@3.11.174/legacy/build/pdf.js';
import { getCorsHeaders } from './cors.ts';

// Run PDF.js in main thread (no worker file needed — avoids iOS Safari worker crash)
pdfjsLib.GlobalWorkerOptions.workerSrc = '';

// ─── Render one PDF page → WebP ArrayBuffer ────────────────────────────────

async function renderPage(
  pdfBuffer: ArrayBuffer,
  pageNum: number,
): Promise<ArrayBuffer | null> {
  try {
    const pdf      = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    const page     = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 }); // 2× for quality

    const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx    = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;

    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
    return blob.arrayBuffer();
  } catch (err) {
    console.error(`[pdf-pages] renderPage ${pageNum} error:`, err);
    return null;
  }
}

// ─── Main handler ──────────────────────────────────────────────────────────

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET')     return new Response('Method not allowed', { status: 405, headers: cors });

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response('Unauthorized', { status: 401, headers: cors });

  // ── Params ────────────────────────────────────────────────────────────────
  const reqUrl = new URL(req.url);
  const path   = reqUrl.searchParams.get('path');  // storage path inside past-papers bucket
  const page   = reqUrl.searchParams.get('page');  // 'meta' | '1' | '2' ...

  if (!path || !page) {
    return new Response('Missing path or page param', { status: 400, headers: cors });
  }

  // ── Fetch the raw PDF once (shared for meta + page requests) ─────────────
  async function getPdfBuffer(): Promise<ArrayBuffer | null> {
    const { data, error } = await supabase.storage.from('past-papers').download(path!);
    if (error || !data) return null;
    return data.arrayBuffer();
  }

  // ── Metadata request ──────────────────────────────────────────────────────
  if (page === 'meta') {
    // Return cached meta if available
    const { data: cached } = await supabase.storage
      .from('pdf-page-cache')
      .download(`${path}/meta.json`);

    if (cached) {
      return new Response(await cached.text(), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Not cached — parse PDF to get numPages
    const pdfBuffer = await getPdfBuffer();
    if (!pdfBuffer) {
      return new Response(JSON.stringify({ error: 'pdf_not_found' }), {
        status: 404,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    let numPages: number;
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
      numPages = pdf.numPages;
    } catch {
      return new Response(JSON.stringify({ error: 'pdf_parse_failed' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const meta = JSON.stringify({ numPages });
    await supabase.storage
      .from('pdf-page-cache')
      .upload(`${path}/meta.json`, new TextEncoder().encode(meta), {
        contentType: 'application/json',
        upsert: true,
      });

    return new Response(meta, {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // ── Page image request ────────────────────────────────────────────────────
  const pageNum = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    return new Response('Invalid page number', { status: 400, headers: cors });
  }

  // Return cached image if available
  const { data: cachedImg } = await supabase.storage
    .from('pdf-page-cache')
    .download(`${path}/page-${pageNum}.webp`);

  if (cachedImg) {
    return new Response(await cachedImg.arrayBuffer(), {
      headers: { ...cors, 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=86400' },
    });
  }

  // Not cached — render the page on demand
  const pdfBuffer = await getPdfBuffer();
  if (!pdfBuffer) {
    return new Response('PDF not found', { status: 404, headers: cors });
  }

  const imageBuffer = await renderPage(pdfBuffer, pageNum);
  if (!imageBuffer) {
    return new Response('Rendering failed', { status: 500, headers: cors });
  }

  // Cache for future requests (fire-and-forget, don't block the response)
  supabase.storage
    .from('pdf-page-cache')
    .upload(`${path}/page-${pageNum}.webp`, imageBuffer, {
      contentType: 'image/webp',
      upsert: true,
    })
    .catch(() => { /* non-blocking */ });

  return new Response(imageBuffer, {
    headers: { ...cors, 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=86400' },
  });
});
