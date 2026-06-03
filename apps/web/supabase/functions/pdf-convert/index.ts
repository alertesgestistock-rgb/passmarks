import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { CORS } from './cors.ts';

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

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

  // ── Download PDF ─────────────────────────────────────────────────────────────
  const { data: pdfBlob, error: dlError } = await supabase.storage.from('past-papers').download(path);
  if (dlError || !pdfBlob) {
    console.error('[pdf-convert] Download failed:', dlError?.message);
    return new Response(JSON.stringify({ error: 'PDF not found', detail: dlError?.message }), { status: 404, headers: CORS });
  }
  const pdfBuffer = await pdfBlob.arrayBuffer();
  console.log(`[pdf-convert] Downloaded (${(pdfBuffer.byteLength / 1024).toFixed(0)} KB)`);

  // ── Load mupdf WASM (no OffscreenCanvas needed) ───────────────────────────────
  const mupdfMod = await import('npm:mupdf@1.3.0');
  const mupdf = mupdfMod.default ?? mupdfMod;

  const errors: string[] = [];
  let numPages = 0;
  let converted = 0;

  try {
    const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
    numPages = doc.countPages();
    console.log(`[pdf-convert] ${numPages} pages`);

    // 1.5x scale → ~892×1263px per A4 page
    const scale  = 1.5;
    const matrix = [scale, 0, 0, scale, 0, 0];

    for (let i = 0; i < numPages; i++) {
      try {
        const page   = doc.loadPage(i);
        const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
        const png    = pixmap.asPNG();

        const { error: uploadErr } = await supabase.storage
          .from('pdf-page-cache')
          .upload(`${path}/page-${i + 1}.png`, png, { contentType: 'image/png', upsert: true });

        if (uploadErr) {
          const msg = `page ${i + 1} upload: ${uploadErr.message}`;
          console.error('[pdf-convert]', msg);
          errors.push(msg);
        } else {
          converted++;
          console.log(`[pdf-convert] page ${i + 1}/${numPages} ✓`);
        }

        pixmap.destroy();
        page.destroy();
      } catch (err) {
        const msg = `page ${i + 1} render: ${(err as Error).message}`;
        console.error('[pdf-convert]', msg);
        errors.push(msg);
      }
    }

    doc.destroy();
  } catch (err) {
    console.error('[pdf-convert] Render failed:', (err as Error).message);
    return new Response(
      JSON.stringify({ error: 'Render failed', detail: (err as Error).message }),
      { status: 500, headers: CORS },
    );
  }

  // ── Save meta only when at least one page succeeded ───────────────────────────
  if (converted > 0) {
    await supabase.storage
      .from('pdf-page-cache')
      .upload(`${path}/meta.json`,
        new TextEncoder().encode(JSON.stringify({ numPages })),
        { contentType: 'application/json', upsert: true },
      );
  }

  console.log(`[pdf-convert] Done: ${converted}/${numPages} pages`);
  return new Response(
    JSON.stringify({ success: converted === numPages, numPages, converted, errors }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  );
});
