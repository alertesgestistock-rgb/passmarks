import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getCorsHeaders } from './cors.ts';

// ──────────────────────────────────────────────────────────────────
// pdf-upload Edge Function
// Reçoit un PDF en multipart/form-data depuis le client mobile,
// le convertit en images JPEG via mupdf WASM (côté serveur, sans
// canvas ni binaire), et retourne les images en base64.
//
// Avantage : aucun pdfjs-dist côté client → 0 bug iOS/Android.
// ──────────────────────────────────────────────────────────────────

const MAX_PAGES = 10;        // Limite de pages analysables
const MAX_SIZE  = 15_000_000; // 15 MB
const SCALE     = 1.5;       // ~892×1263 px pour une page A4
const JPEG_Q    = 82;        // Qualité JPEG (bon compromis taille/lisibilité)

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  // ── Auth ──────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response('Unauthorized', { status: 401, headers: cors });

  // ── Lecture du PDF depuis le body ─────────────────────────────────
  let pdfBuffer: ArrayBuffer;
  let fileName = 'document.pdf';

  const contentType = req.headers.get('content-type') ?? '';

  try {
    if (contentType.includes('multipart/form-data')) {
      // Upload depuis un <input type="file">
      const form = await req.formData();
      const file = form.get('file') as File | null;
      if (!file) {
        return new Response(JSON.stringify({ error: 'No file in form data' }), { status: 400, headers: cors });
      }
      fileName   = file.name;
      pdfBuffer  = await file.arrayBuffer();
    } else {
      // Fallback : body binaire brut (application/pdf)
      pdfBuffer = await req.arrayBuffer();
      const nameHeader = req.headers.get('x-file-name');
      if (nameHeader) fileName = nameHeader;
    }
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to read request body', detail: (err as Error).message }),
      { status: 400, headers: cors },
    );
  }

  // ── Validation taille ─────────────────────────────────────────────
  if (pdfBuffer.byteLength > MAX_SIZE) {
    return new Response(
      JSON.stringify({ error: `PDF trop grand (max ${MAX_SIZE / 1_000_000} MB)` }),
      { status: 413, headers: cors },
    );
  }

  console.log(`[pdf-upload] user=${user.id} file="${fileName}" size=${(pdfBuffer.byteLength / 1024).toFixed(0)} KB`);

  // ── Conversion mupdf WASM ─────────────────────────────────────────
  let mupdf: any;
  try {
    const mod = await import('npm:mupdf@1.3.0');
    mupdf = mod.default ?? mod;
  } catch (err) {
    console.error('[pdf-upload] mupdf import failed:', err);
    return new Response(
      JSON.stringify({ error: 'PDF engine unavailable', detail: (err as Error).message }),
      { status: 500, headers: cors },
    );
  }

  const images: string[] = [];  // base64 JPEG par page
  let numPages = 0;

  try {
    const doc = mupdf.Document.openDocument(pdfBuffer, 'application/pdf');
    numPages   = doc.countPages();
    console.log(`[pdf-upload] ${numPages} pages`);

    // Trop de pages → retourner un message explicatif sans conversion
    if (numPages > MAX_PAGES) {
      doc.destroy();
      return new Response(
        JSON.stringify({
          error: 'too_many_pages',
          numPages,
          message: `Ce PDF a ${numPages} pages — PassMark peut analyser au maximum ${MAX_PAGES} pages. Envoie une photo de la question qui te pose problème 📷`,
        }),
        { status: 422, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const matrix = [SCALE, 0, 0, SCALE, 0, 0];

    for (let i = 0; i < numPages; i++) {
      const page   = doc.loadPage(i);
      const pixmap = page.toPixmap(matrix, mupdf.ColorSpace.DeviceRGB, false, true);
      const jpeg   = pixmap.asJPEG(JPEG_Q, false) as Uint8Array;

      // Convertir en base64
      let binary = '';
      for (let j = 0; j < jpeg.length; j++) binary += String.fromCharCode(jpeg[j]);
      images.push(btoa(binary));

      pixmap.destroy();
      page.destroy();
      console.log(`[pdf-upload] page ${i + 1}/${numPages} ✓`);
    }

    doc.destroy();
  } catch (err) {
    console.error('[pdf-upload] mupdf render error:', err);
    return new Response(
      JSON.stringify({ error: 'Render failed', detail: (err as Error).message }),
      { status: 500, headers: cors },
    );
  }

  console.log(`[pdf-upload] Done — ${images.length} images retournées`);

  return new Response(
    JSON.stringify({ success: true, numPages, images, fileName }),
    { headers: { ...cors, 'Content-Type': 'application/json' } },
  );
});
