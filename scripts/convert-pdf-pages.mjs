/**
 * Convert PDF papers → WebP page images and upload to Supabase pdf-page-cache bucket.
 *
 * Setup (run once):
 *   cd scripts
 *   npm install
 *
 * Usage:
 *   node convert-pdf-pages.mjs                          ← converts ALL active papers with a pdf_url
 *   node convert-pdf-pages.mjs gce-board/.../paper.pdf  ← converts one specific storage path
 *
 * Required env vars (copy from your apps/web/.env):
 *   SUPABASE_URL=https://xxx.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 *
 * You can also create a scripts/.env file with those two variables.
 */

import { createClient } from '@supabase/supabase-js';
import { pdf }          from 'pdf-to-img';
import sharp            from 'sharp';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Load .env if present ──────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
try {
  const envPath = resolve(__dirname, '.env');
  const lines = readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim();
  }
} catch { /* .env not found — rely on process.env */ }

const SUPABASE_URL      = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function convertPaper(storagePath) {
  console.log(`\n📄 Converting: ${storagePath}`);

  // Download PDF
  const { data: pdfBlob, error: dlError } = await supabase.storage
    .from('past-papers')
    .download(storagePath);

  if (dlError || !pdfBlob) {
    console.error(`  ✗ Failed to download: ${dlError?.message}`);
    return;
  }

  const pdfBuffer = Buffer.from(await pdfBlob.arrayBuffer());
  console.log(`  ↓ Downloaded (${(pdfBuffer.length / 1024).toFixed(0)} KB)`);

  // Convert pages
  const doc = await pdf(pdfBuffer, { scale: 2.0 });
  const numPages = doc.length;
  console.log(`  📑 ${numPages} page(s) detected`);

  for (let i = 0; i < numPages; i++) {
    const pageNum = i + 1;
    process.stdout.write(`  → Page ${pageNum}/${numPages}...`);

    // pdf-to-img yields PNG buffers
    let pngBuffer;
    let idx = 0;
    for await (const page of doc) {
      if (idx === i) { pngBuffer = page; break; }
      idx++;
    }

    if (!pngBuffer) { console.log(' ✗ empty'); continue; }

    // PNG → WebP at 85% quality
    const webpBuffer = await sharp(pngBuffer).webp({ quality: 85 }).toBuffer();

    const cachePath = `${storagePath}/page-${pageNum}.webp`;
    const { error: upError } = await supabase.storage
      .from('pdf-page-cache')
      .upload(cachePath, webpBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (upError) { console.log(` ✗ upload failed: ${upError.message}`); continue; }
    console.log(` ✓ (${(webpBuffer.length / 1024).toFixed(0)} KB)`);
  }

  // Upload meta.json
  const meta = JSON.stringify({ numPages });
  await supabase.storage
    .from('pdf-page-cache')
    .upload(`${storagePath}/meta.json`, Buffer.from(meta), {
      contentType: 'application/json',
      upsert: true,
    });

  console.log(`  ✅ Done — meta.json written (numPages: ${numPages})`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const arg = process.argv[2];

if (arg && arg !== '--all') {
  // Convert a single path passed as argument
  await convertPaper(arg);
} else {
  // Convert all active papers that have a pdf_url
  const { data: papers, error } = await supabase
    .from('gce_papers')
    .select('pdf_url')
    .eq('is_active', true)
    .not('pdf_url', 'is', null);

  if (error) { console.error('DB error:', error.message); process.exit(1); }
  if (!papers.length) { console.log('No active papers with a PDF URL found.'); process.exit(0); }

  console.log(`Found ${papers.length} paper(s) to convert.`);

  for (const paper of papers) {
    const match = paper.pdf_url?.match(/\/object\/public\/past-papers\/(.+)$/);
    if (!match) { console.warn(`  Skipping — can't parse path from: ${paper.pdf_url}`); continue; }
    await convertPaper(match[1]);
  }
}

console.log('\n✅ All done.');
