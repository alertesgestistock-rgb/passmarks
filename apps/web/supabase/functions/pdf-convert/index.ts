import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { CORS } from './cors.ts';
import { r2Upload, r2FetchPublic, R2_BUCKET_PRIVATE } from '../_shared/r2Client.ts';

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

  const pdfBytes = await r2FetchPublic(path);
  if (!pdfBytes) {
    console.error('[pdf-convert] Download failed: not found in R2 public bucket');
    return new Response(JSON.stringify({ error: 'PDF not found' }), { status: 404, headers: CORS });
  }
  const pdfBuffer = pdfBytes.buffer.slice(pdfBytes.byteOffset, pdfBytes.byteOffset + pdfBytes.byteLength);
  console.log(`[pdf-convert] Downloaded (${(pdfBuffer.byteLength / 1024).toFixed(0)} KB)`);

  // mupdf WASM — no OffscreenCanvas needed, works in Deno/Supabase EF
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
        // JPEG quality 88 → ~210 KB/page vs ~950 KB PNG (4.5x smaller)
        const jpeg   = pixmap.asJPEG(88, false);

        try {
          await r2Upload(R2_BUCKET_PRIVATE, `${path}/page-${i + 1}.jpg`, jpeg, 'image/jpeg');
          converted++;
          console.log(`[pdf-convert] page ${i + 1}/${numPages} ✓`);
        } catch (uploadErr) {
          const msg = (uploadErr as Error).message;
          errors.push(`page ${i + 1}: ${msg}`);
          console.error(`[pdf-convert] page ${i + 1} upload:`, msg);
        }

        pixmap.destroy();
        page.destroy();
      } catch (err) {
        const msg = `page ${i + 1}: ${(err as Error).message}`;
        errors.push(msg);
        console.error('[pdf-convert]', msg);
      }
    }

    doc.destroy();
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Render failed', detail: (err as Error).message }),
      { status: 500, headers: CORS },
    );
  }

  if (converted > 0) {
    await r2Upload(
      R2_BUCKET_PRIVATE,
      `${path}/meta.json`,
      new TextEncoder().encode(JSON.stringify({ numPages })),
      'application/json',
    );
  }

  console.log(`[pdf-convert] Done: ${converted}/${numPages}`);
  return new Response(
    JSON.stringify({ success: converted === numPages, numPages, converted, errors }),
    { headers: { ...CORS, 'Content-Type': 'application/json' } },
  );
});
