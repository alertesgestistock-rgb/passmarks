import { supabase } from './supabase';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 3 * 1024 * 1024; // 3 MB

// Magic byte signatures for each allowed type
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
    // RIFF at 0, WEBP at 8
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

/**
 * Validates and uploads an avatar file to Supabase Storage.
 * Checks: file size, declared MIME type, magic bytes.
 * Returns the public URL with a cache-busting timestamp.
 */
export async function uploadAvatar(file, userId) {
  if (!file || !userId) throw new Error('File or user missing.');

  if (file.size > MAX_SIZE) {
    throw new Error('File too large. Maximum 3 MB.');
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Unsupported format. Use JPEG, PNG or WebP.');
  }

  // Read first 12 bytes to check magic bytes — never trust declared MIME alone
  const header = await file.slice(0, 12).arrayBuffer();
  const detectedType = detectType(header);

  if (!detectedType) {
    throw new Error('Invalid or corrupted file (unknown signature).');
  }

  // Declared MIME must match actual bytes
  if (detectedType !== file.type) {
    throw new Error('File content does not match its extension.');
  }

  const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[detectedType];
  const path = `${userId}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: detectedType });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
