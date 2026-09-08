import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';
import { getCorsHeaders } from './cors.ts';
import { r2Download, R2_BUCKET_PRIVATE } from '../_shared/r2Client.ts';

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: cors });

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return new Response('Unauthorized', { status: 401, headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return new Response('Unauthorized', { status: 401, headers: cors });

  const reqUrl = new URL(req.url);
  const path   = reqUrl.searchParams.get('path');
  const page   = reqUrl.searchParams.get('page');

  if (!path || !page) {
    return new Response('Missing path or page param', { status: 400, headers: cors });
  }

  if (page === 'meta') {
    let cached = await r2Download(R2_BUCKET_PRIVATE, `${path}/meta.json`);

    // Fallback: papers converted before the R2 migration still live in Supabase Storage
    if (!cached) {
      const { data: legacy } = await supabase.storage.from('pdf-page-cache').download(`${path}/meta.json`);
      if (legacy) cached = new Uint8Array(await legacy.arrayBuffer());
    }

    if (cached) {
      return new Response(new TextDecoder().decode(cached), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'not_converted' }), {
      status: 404,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const pageNum = parseInt(page, 10);
  if (isNaN(pageNum) || pageNum < 1) {
    return new Response('Invalid page number', { status: 400, headers: cors });
  }

  // Try JPEG first (current format), fall back to PNG (papers converted before JPEG switch)
  const jpgImg = await r2Download(R2_BUCKET_PRIVATE, `${path}/page-${pageNum}.jpg`);
  if (jpgImg) {
    return new Response(jpgImg, {
      headers: { ...cors, 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' },
    });
  }

  const pngImg = await r2Download(R2_BUCKET_PRIVATE, `${path}/page-${pageNum}.png`);
  if (pngImg) {
    return new Response(pngImg, {
      headers: { ...cors, 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=86400' },
    });
  }

  // Fallback: not on R2 yet → this paper was converted before the R2 migration,
  // its pages still live in the legacy Supabase Storage 'pdf-page-cache' bucket.
  const { data: legacyJpg } = await supabase.storage.from('pdf-page-cache').download(`${path}/page-${pageNum}.jpg`);
  if (legacyJpg) {
    return new Response(await legacyJpg.arrayBuffer(), {
      headers: { ...cors, 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=86400' },
    });
  }

  const { data: legacyPng } = await supabase.storage.from('pdf-page-cache').download(`${path}/page-${pageNum}.png`);
  if (legacyPng) {
    return new Response(await legacyPng.arrayBuffer(), {
      headers: { ...cors, 'Content-Type': 'image/png', 'Cache-Control': 'private, max-age=86400' },
    });
  }

  return new Response('Page not found', { status: 404, headers: cors });
});
