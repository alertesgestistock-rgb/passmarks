-- Enable pg_net extension (HTTP calls from Postgres)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Trigger function: called when pdf_url is set on a gce_papers row
CREATE OR REPLACE FUNCTION public.on_pdf_url_set()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pdf_path text;
BEGIN
  -- Only fire when pdf_url is newly set or changed
  IF NEW.pdf_url IS NULL THEN RETURN NEW; END IF;
  IF OLD.pdf_url IS NOT DISTINCT FROM NEW.pdf_url THEN RETURN NEW; END IF;

  -- Extract the storage path from the full public URL
  -- e.g. https://xxx.supabase.co/storage/v1/object/public/past-papers/gce-board/.../paper.pdf
  --   → gce-board/.../paper.pdf
  pdf_path := split_part(NEW.pdf_url, '/object/public/past-papers/', 2);
  IF pdf_path = '' OR pdf_path = NEW.pdf_url THEN RETURN NEW; END IF;

  -- Non-blocking HTTP POST to pdf-convert Edge Function
  -- The webhook secret is set via: supabase secrets set PDF_WEBHOOK_SECRET=pm_pdf_conv_passmark
  PERFORM net.http_post(
    url     := 'https://dnnbtzvidbsodqolpqia.supabase.co/functions/v1/pdf-convert',
    headers := jsonb_build_object(
      'Content-Type',     'application/json',
      'x-webhook-secret', 'pm_pdf_conv_passmark'
    ),
    body    := jsonb_build_object('path', pdf_path)::text,
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

-- Attach trigger to gce_papers table
DROP TRIGGER IF EXISTS trg_pdf_url_set ON public.gce_papers;
CREATE TRIGGER trg_pdf_url_set
  AFTER INSERT OR UPDATE OF pdf_url
  ON public.gce_papers
  FOR EACH ROW
  EXECUTE FUNCTION public.on_pdf_url_set();

-- Note: the EF URL and webhook secret are hardcoded in the trigger function above.
-- Supabase managed Postgres does not allow ALTER DATABASE SET for custom params.
