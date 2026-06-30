
-- Resume file metadata
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Storage policies: users manage their own files under resumes/<uid>/...
CREATE POLICY "Users read own resume files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users insert own resume files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users update own resume files" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users delete own resume files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Notifications: allow system inserts via service role; also let recruiter insert notifications targeted at applicants of their jobs (used by app code)
CREATE POLICY "Recruiter notifies applicants" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.user_id = notifications.user_id
        AND j.posted_by = auth.uid()
    )
  );

-- Auto-update updated_at on applications/jobs (idempotent)
DROP TRIGGER IF EXISTS tg_applications_updated_at ON public.applications;
CREATE TRIGGER tg_applications_updated_at BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
DROP TRIGGER IF EXISTS tg_jobs_updated_at ON public.jobs;
CREATE TRIGGER tg_jobs_updated_at BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
