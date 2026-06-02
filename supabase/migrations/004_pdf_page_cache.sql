-- Private bucket for pre-rendered PDF page images (WebP)
-- Pages are served via the pdf-pages Edge Function (auth required)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pdf-page-cache',
  'pdf-page-cache',
  false,
  10485760,
  ARRAY['image/webp', 'application/json']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760;