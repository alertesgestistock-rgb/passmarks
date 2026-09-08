// Shared Cloudflare R2 client (S3-compatible API) for Supabase Edge Functions.
//
// Required secrets (set via `supabase secrets set ...`):
//   R2_ACCOUNT_ID          - Cloudflare account id
//   R2_ACCESS_KEY_ID       - R2 API token access key id
//   R2_SECRET_ACCESS_KEY   - R2 API token secret access key
//   R2_BUCKET_PUBLIC       - name of the public bucket (past papers PDFs)
//   R2_BUCKET_PRIVATE      - name of the private bucket (rendered page images)
//   R2_PUBLIC_URL          - public base URL for R2_BUCKET_PUBLIC
//                            (e.g. https://pub-xxxx.r2.dev, or a custom domain)

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from 'https://esm.sh/@aws-sdk/client-s3@3.620.0';

const ACCOUNT_ID        = Deno.env.get('R2_ACCOUNT_ID') ?? '';
const ACCESS_KEY_ID     = Deno.env.get('R2_ACCESS_KEY_ID') ?? '';
const SECRET_ACCESS_KEY = Deno.env.get('R2_SECRET_ACCESS_KEY') ?? '';

export const R2_BUCKET_PUBLIC  = Deno.env.get('R2_BUCKET_PUBLIC') ?? 'pdf-public';
export const R2_BUCKET_PRIVATE = Deno.env.get('R2_BUCKET_PRIVATE') ?? 'images-private';
export const R2_PUBLIC_URL     = (Deno.env.get('R2_PUBLIC_URL') ?? '').replace(/\/$/, '');

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

/** Upload bytes to an R2 bucket. */
export async function r2Upload(
  bucket: string,
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  await r2.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

/** Download an object from an R2 bucket. Returns null if the key doesn't exist. */
export async function r2Download(bucket: string, key: string): Promise<Uint8Array | null> {
  try {
    const res = await r2.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const stream = res.Body as ReadableStream<Uint8Array>;
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      total += value.length;
    }
    const out = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      out.set(chunk, offset);
      offset += chunk.length;
    }
    return out;
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'NoSuchKey' || name === 'NotFound') return null;
    throw err;
  }
}

/** Fetch a PDF from the public R2 bucket via its public URL (no S3 creds needed for reads). */
export async function r2FetchPublic(path: string): Promise<Uint8Array | null> {
  if (!R2_PUBLIC_URL) throw new Error('R2_PUBLIC_URL is not set');
  const res = await fetch(`${R2_PUBLIC_URL}/${path}`);
  if (!res.ok) return null;
  return new Uint8Array(await res.arrayBuffer());
}
