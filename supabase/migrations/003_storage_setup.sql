-- Create past-papers storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'past-papers',
  'past-papers',
  true,
  52428800,
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- RLS policies for storage
DROP POLICY IF EXISTS "Public read past-papers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload past-papers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update past-papers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete past-papers" ON storage.objects;

CREATE POLICY "Public read past-papers"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'past-papers');

CREATE POLICY "Authenticated upload past-papers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'past-papers');

CREATE POLICY "Authenticated update past-papers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'past-papers');

CREATE POLICY "Authenticated delete past-papers"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'past-papers');
