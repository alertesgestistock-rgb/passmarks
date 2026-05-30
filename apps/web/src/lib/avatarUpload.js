import { supabase } from './supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 3 * 1024 * 1024; // 3 MB

const SIGNATURES = [
  {
    type: 'image/jpeg',
    bytes: [0xff, 0xd8, 0xff],
    offset: 0,
  },
  {
    type: 'image/png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    offset: 0,
  },
  {
    type: 'image/webp',
    bytes: [0x52, 0x49, 0x46, 0x46],
    offset: 0,
    secondary: { bytes: [0x57, 0x45, 0x42, 0x50], offset: 8 },
  },
];

function detectType(buffer) {
  const u8 = new Uint8Array(buffer);
  for (const sig of SIGNATURES) {
    const primary = sig.bytes.every((b, i) => u8[sig.offset + i] === b);
    if (!primary) continue;
    if (sig.secondary) {
      const secondary = sig.secondary.bytes.every((b, i) => u8[sig.secondary.offset + i] === b);
      if (secondary) return sig.type;
    } else {
      return sig.type;
    }
  }
  return null;
}

export async function uploadAvatar(file, userId) {
  console.log('[Avatar] Starting upload — userId:', userId, 'file:', file?.name, file?.type, file?.size);

  if (!file || !userId) throw new Error('File or user missing.');

  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum 3 MB.');
  }

  // Accept image/jpg as alias for image/jpeg (some browsers/OS report it differently)
  const normalizedType = file.type === 'image/jpg' ? 'image/jpeg' : file.type;

  if (!ALLOWED_TYPES.includes(normalizedType)) {
    throw new Error(`Unsupported format (${file.type}). Use JPEG, PNG or WebP.`);
  }

  const header = await file.slice(0, 12).arrayBuffer();
  const detectedType = detectType(header);
  console.log('[Avatar] Declared:', normalizedType, '— Detected:', detectedType);

  if (!detectedType) {
    throw new Error('Invalid or corrupted file (unknown signature).');
  }

  if (detectedType !== normalizedType) {
    throw new Error(`File content mismatch: declared ${normalizedType}, detected ${detectedType}.`);
  }

  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[detectedType];
  const path = `${userId}/avatar.${ext}`;
  console.log('[Avatar] Uploading to path:', path);

  const { data: uploadData, error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: detectedType });

  console.log('[Avatar] Upload result — data:', uploadData, 'error:', error);

  if (error) {
    if (error.message?.includes('JWT') || error.statusCode === 401 || error.statusCode === 403) {
      throw new Error('Session expired. Please log out and log in again.');
    }
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const url = `${data.publicUrl}?t=${Date.now()}`;
  console.log('[Avatar] Public URL:', url);
  return url;
}
