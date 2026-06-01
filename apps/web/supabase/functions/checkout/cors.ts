const allowedOrigins = [
  'https://passmarks.vercel.app',
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:5173',
];

export const getCorsHeaders = (req: Request) => {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
};
