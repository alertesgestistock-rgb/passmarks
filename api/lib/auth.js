import { createRemoteJWKSet, jwtVerify } from 'jose';

const projectId = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '')
  .replace('https://', '')
  .replace('.supabase.co', '');

// Public keys are cached across warm function instances
const JWKS = createRemoteJWKSet(
  new URL(`https://${projectId}.supabase.co/auth/v1/.well-known/jwks.json`)
);

/**
 * Verifies a Supabase JWT locally using the project's public JWKS.
 * No network roundtrip to the auth server — sub-millisecond vs 100-300ms.
 * Returns { userId, email } or throws on invalid/expired token.
 */
export async function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Missing token');
  }
  const token = authHeader.slice(7);
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `https://${projectId}.supabase.co/auth/v1`,
    audience: 'authenticated',
  });
  return { userId: payload.sub, email: payload.email };
}
