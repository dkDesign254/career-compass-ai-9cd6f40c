
-- Roles enum & user_roles
CREATE TYPE public.app_role AS ENUM ('student','recruiter','company_admin','admin','cms_editor');

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  headline TEXT,
  location TEXT,
  phone TEXT,
  theme_preference TEXT DEFAULT 'system',
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-create profile + default student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'avatar_url')
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.tg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Career profile
CREATE TABLE public.career_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  target_role TEXT,
  industry TEXT,
  experience_level TEXT,
  target_locations TEXT[],
  work_modes TEXT[],
  employment_types TEXT[],
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  skills JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  work_history JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  recommendations JSONB DEFAULT '[]'::jsonb,
  career_goals TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_profiles TO authenticated;
GRANT ALL ON public.career_profiles TO service_role;
ALTER TABLE public.career_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own career profile" ON public.career_profiles FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER career_profiles_updated_at BEFORE UPDATE ON public.career_profiles FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Resumes
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_path TEXT,
  file_type TEXT,
  raw_text TEXT,
  parsed_data JSONB,
  ats_score INTEGER,
  ats_analysis JSONB,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resumes TO authenticated;
GRANT ALL ON public.resumes TO service_role;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own resumes" ON public.resumes FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER resumes_updated_at BEFORE UPDATE ON public.resumes FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  website TEXT,
  logo_url TEXT,
  description TEXT,
  industry TEXT,
  size TEXT,
  headquarters TEXT,
  usaid_partner BOOLEAN NOT NULL DEFAULT false,
  verified BOOLEAN NOT NULL DEFAULT false,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.companies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies public read" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Owner manages company" ON public.companies FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "Recruiter creates company" ON public.companies FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'recruiter') OR has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'admin')
);
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Jobs
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  posted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  source_url TEXT,
  external_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  requirements TEXT,
  responsibilities TEXT,
  location TEXT,
  work_mode TEXT,
  employment_type TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  application_cap INTEGER DEFAULT 30,
  application_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'open',
  deadline TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX jobs_status_idx ON public.jobs(status);
CREATE INDEX jobs_posted_by_idx ON public.jobs(posted_by);
CREATE UNIQUE INDEX jobs_source_external_idx ON public.jobs(source, external_id) WHERE external_id IS NOT NULL;
GRANT SELECT ON public.jobs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.jobs TO authenticated;
GRANT ALL ON public.jobs TO service_role;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jobs public read" ON public.jobs FOR SELECT USING (status = 'open' OR posted_by = auth.uid());
CREATE POLICY "Recruiter posts jobs" ON public.jobs FOR INSERT TO authenticated WITH CHECK (
  posted_by = auth.uid() AND (has_role(auth.uid(), 'recruiter') OR has_role(auth.uid(), 'company_admin') OR has_role(auth.uid(), 'admin'))
);
CREATE POLICY "Poster updates own job" ON public.jobs FOR UPDATE TO authenticated USING (posted_by = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Poster deletes own job" ON public.jobs FOR DELETE TO authenticated USING (posted_by = auth.uid() OR has_role(auth.uid(), 'admin'));
CREATE TRIGGER jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'saved',
  notes TEXT,
  match_score INTEGER,
  match_analysis JSONB,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.applications TO authenticated;
GRANT ALL ON public.applications TO service_role;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Applicant owns application" ON public.applications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recruiter views job applications" ON public.applications FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.posted_by = auth.uid())
);
CREATE POLICY "Recruiter updates job applications" ON public.applications FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = applications.job_id AND j.posted_by = auth.uid())
);
CREATE TRIGGER applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Generated docs
CREATE TABLE public.generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  doc_type TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_documents TO authenticated;
GRANT ALL ON public.generated_documents TO service_role;
ALTER TABLE public.generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own generated docs" ON public.generated_documents FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Interview sessions
CREATE TABLE public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedback JSONB,
  score INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_sessions TO authenticated;
GRANT ALL ON public.interview_sessions TO service_role;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own interview sessions" ON public.interview_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER interview_sessions_updated_at BEFORE UPDATE ON public.interview_sessions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Subscriptions
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own subscription" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- AI run usage (quota)
CREATE TABLE public.ai_run_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  run_type TEXT NOT NULL,
  job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
  tokens_used INTEGER,
  period_month DATE NOT NULL DEFAULT date_trunc('month', now())::date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_run_usage_user_period_idx ON public.ai_run_usage(user_id, period_month, run_type);
GRANT SELECT ON public.ai_run_usage TO authenticated;
GRANT ALL ON public.ai_run_usage TO service_role;
ALTER TABLE public.ai_run_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own usage" ON public.ai_run_usage FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Feedback threads (recruiter <-> applicant)
CREATE TABLE public.feedback_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL UNIQUE REFERENCES public.applications(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  recruiter_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.feedback_threads TO authenticated;
GRANT ALL ON public.feedback_threads TO service_role;
ALTER TABLE public.feedback_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Thread participants read" ON public.feedback_threads FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.applications a WHERE a.id = feedback_threads.application_id AND (a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id AND j.posted_by = auth.uid())))
);
CREATE POLICY "Recruiter creates thread" ON public.feedback_threads FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.applications a JOIN public.jobs j ON j.id = a.job_id WHERE a.id = feedback_threads.application_id AND j.posted_by = auth.uid())
);

CREATE TABLE public.feedback_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.feedback_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.feedback_messages TO authenticated;
GRANT ALL ON public.feedback_messages TO service_role;
ALTER TABLE public.feedback_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Thread participants read messages" ON public.feedback_messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.feedback_threads t JOIN public.applications a ON a.id = t.application_id WHERE t.id = feedback_messages.thread_id AND (a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id AND j.posted_by = auth.uid())))
);
CREATE POLICY "Thread participants send" ON public.feedback_messages FOR INSERT TO authenticated WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.feedback_threads t JOIN public.applications a ON a.id = t.application_id WHERE t.id = feedback_messages.thread_id AND (a.user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id AND j.posted_by = auth.uid())))
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_read_idx ON public.notifications(user_id, read);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Mark own read" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Blog posts
CREATE TABLE public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  body_md TEXT NOT NULL,
  cover_image_url TEXT,
  tags TEXT[],
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public reads published posts" ON public.blog_posts FOR SELECT USING (published = true);
CREATE POLICY "Editors manage posts" ON public.blog_posts FOR ALL TO authenticated USING (
  has_role(auth.uid(), 'cms_editor') OR has_role(auth.uid(), 'admin')
) WITH CHECK (
  has_role(auth.uid(), 'cms_editor') OR has_role(auth.uid(), 'admin')
);
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Audit log
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin reads audit" ON public.audit_log FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
