CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

GRANT INSERT ON public.ai_run_usage TO authenticated;
CREATE POLICY "Insert own usage" ON public.ai_run_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.job_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  base_url TEXT NOT NULL,
  region TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_scraped_at TIMESTAMPTZ,
  last_status TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_sources TO authenticated;
GRANT ALL ON public.job_sources TO service_role;
ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth view sources" ON public.job_sources
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage sources" ON public.job_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_job_sources_updated
  BEFORE UPDATE ON public.job_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS source_url TEXT,
  ADD COLUMN IF NOT EXISTS external_id TEXT,
  ADD COLUMN IF NOT EXISTS is_scraped BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_external_uidx
  ON public.jobs(source, external_id) WHERE external_id IS NOT NULL;

CREATE POLICY "Auth view scraped open jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (is_scraped = true AND status = 'open');

INSERT INTO public.job_sources (name, base_url, region) VALUES
  ('BrighterMonday Kenya', 'https://www.brightermonday.co.ke/jobs', 'KE'),
  ('MyJobMag Kenya', 'https://www.myjobmag.co.ke/jobs', 'KE'),
  ('Fuzu Kenya', 'https://www.fuzu.com/kenya/jobs', 'KE'),
  ('Remote OK', 'https://remoteok.com/remote-jobs', 'GLOBAL'),
  ('We Work Remotely', 'https://weworkremotely.com/remote-jobs', 'GLOBAL')
ON CONFLICT (name) DO NOTHING;