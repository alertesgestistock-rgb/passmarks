import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { CORS } from './cors.ts';

// ─── Render one page using dynamic pdfjs + OffscreenCanvas ─────────────────

async function renderPage(pdfBuffer: ArrayBuffer, pageNum: number): Promise<ArrayBuffer | null> {
  try {
    // Dynamic import — avoids crashing at startup if pdfjs fails to load
    const mod      = await import('npm:pdfjs-dist@3.11.174/legacy/build/pdf.js');
    const pdfjsLib = mod.default ?? mod;
    if (pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const pdf      = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    const page     = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = new OffscreenCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const ctx    = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;

    await page.render({ canvasContext: ctx as unknown as CanvasRenderingContext2D, viewport }).promise;

    const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.85 });
    return blob.arrayBuffer();
  } catch (err) {
    console.error(`[pdf-convert] renderPage ${pageNum} error:`, (err as Error).message);
    return null;
  }
}

// ─── Main handler ───────────────────────────────────────────────────────────

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  // ── Webhook secret ────────────────────────────────────────────────────────
  const expectedSecret = Deno.env.get('PDF_WEBHOOK_SECRET');
  const receivedSecret = req.headers.get('x-webhook-secret');
  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return new Response('Unauthorized', { status: 401, headers: CORS });
  }

  let path: string;
  try {
    const body = await req.json();
    path = body?.path ?? body?.record?.pdf_url?.split('/object/public/past-papers/')?.[1];
  } catch {
    return new Response('Invalid body', { status: 400, headers: CORS });
  }

  if (!path || typeof path !== 'string') {
    return new Response('Missing path', { status: 400, headers: CORS });
  }

  console.log(`[pdf-convert] Starting: ${path}`);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── Download PDF ──────────────────────────────────────────────────────────
  const { data: pdfBlob, error: dlError } = await supabase.storage
    .from('past-papers')
    .download(path);

  if (dlError || !pdfBlob) {
    console.error('[pdf-convert] Download failed:', dlError?.message);
    return new Response('PDF not found', { status: 404, headers: CORS });
  }

  const pdfBuffer = await pdfBlob.arrayBuffer();
  console.log(`[pdf-convert] PDF downloaded (${(pdfBuffer.byteLength / 1024).toFixed(0)} KB)`);

  // ── Get page count ────────────────────────────────────────────────────────
  let numPages: number;
  try {
    const mod      = await import('npm:pdfjs-dist@3.11.174/legacy/build/pdf.js');
    const pdfjsLib = mod.default ?? mod;
    if (pdfjsLib.GlobalWorkerOptions) pdfjsLib.GlobalWorkerOptions.workerSrc = '';
    const pdf = await pdfjsLib.getDocument({ data: pdfBuffer }).promise;
    numPages  = pdf.numPages;
    console.log(`[pdf-convert] ${numPages} pages`);
  } catch (err) {
    console.error('[pdf-convert] Parse failed:', (err as Error).message);
    return new Response('PDF parse failed: ' + (err as Error).message, { status: 500, headers: CORS });
  }

  // ── Convert each page ─────────────────────────────────────────────────────
  let converted = 0;
  for (let i = 1; i <= numPages; i++) {
    const imageBuffer = await renderPage(pdfBuffer, i);
    if (!imageBuffer) { console.error(`[pdf-convert] page ${i} render failed`); continue; }

    const { error } = await supabase.storage
      .from('pdf-page-cache')
      .upload(`${path}/page-${i}.webp`, imageBuffer, { contentType: 'image/webp', upsert: true });

    if (error) { console.error(`[pdf-convert] page ${i} upload failed:`, error.message); continue; }
    converted++;
    console.log(`[pdf-convert] page ${i}/${numPages} ✓`);
  }

  // ── Save meta ─────────────────────────────────────────────────────────────
  await supabase.storage
    .from('pdf-page-cache')
    .upload(`${path}/meta.json`, new TextEncoder().encode(JSON.stringify({ numPages })), {
      contentType: 'application/json', upsert: true,
    });

  console.log(`[pdf-convert] Done: ${converted}/${numPages} pages`);

  return new Response(
    JSON.stringify({ success: true, numPages, converted }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  );
});
