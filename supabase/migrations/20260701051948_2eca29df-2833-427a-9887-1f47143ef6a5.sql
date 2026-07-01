CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_external_id_key
  ON public.jobs (source, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.job_sources ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "job_sources admin all" ON public.job_sources;
CREATE POLICY "job_sources admin all" ON public.job_sources
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "job_sources authed read" ON public.job_sources;
CREATE POLICY "job_sources authed read" ON public.job_sources
  FOR SELECT TO authenticated USING (true);