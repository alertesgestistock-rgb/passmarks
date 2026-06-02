import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getCorsHeaders } from './cors.ts';

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors });

  // ── Auth ───────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response('Unauthorized', { status: 401, headers: cors });

  // ── Params ─────────────────────────────────────────────────────────────────
  const url    = new URL(req.url);
  const path   = url.searchParams.get('path');   // e.g. gce-board/.../2025-paper-2.pdf
  const page   = url.searchParams.get('page');   // 'meta' | '1' | '2' ...

  if (!path || !page) {
    return new Response('Missing path or page param', { status: 400, headers: cors });
  }

  // ── Metadata ───────────────────────────────────────────────────────────────
  if (page === 'meta') {
    const { data, error } = await supabase.storage
      .from('pdf-page-cache')
      .download(`${path}/meta.json`);

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: 'not_converted' }),
        { status: 404, headers: { ...cors, 'Content-Type': 'application/json' } },
      );
    }

    const text = await data.text();
    return new Response(text, {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // ── Page image ─────────────────────────────────────────────────────────────
  const pageNum = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    return new Response('Invalid page number', { status: 400, headers: cors });
  }

  const { data: imageBlob, error: imageError } = await supabase.storage
    .from('pdf-page-cache')
    .download(`${path}/page-${pageNum}.webp`);

  if (imageError || !imageBlob) {
    return new Response('Page not found', { status: 404, headers: cors });
  }

  const imageBuffer = await imageBlob.arrayBuffer();

  return new Response(imageBuffer, {
    headers: {
      ...cors,
      'Content-Type': 'image/webp',
      'Cache-Control': 'private, no-store',
    },
  });
});
