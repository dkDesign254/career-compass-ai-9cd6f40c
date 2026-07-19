CREATE TABLE public.job_alert_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["consulting", "design", "remote"]
  work_modes JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ["remote", "hybrid"]
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_alert_preferences TO authenticated;
GRANT ALL ON public.job_alert_preferences TO service_role;
ALTER TABLE public.job_alert_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own job alert prefs" ON public.job_alert_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER job_alert_prefs_updated_at BEFORE UPDATE ON public.job_alert_preferences
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
