
-- 1) job_sources: drop overlapping open-read policies (admin policy already covers admins)
DROP POLICY IF EXISTS "Auth view sources" ON public.job_sources;
DROP POLICY IF EXISTS "job_sources authed read" ON public.job_sources;

-- 2) notifications: constrain recruiter inserts to an allowlist of types
DROP POLICY IF EXISTS "Recruiter notifies applicants" ON public.notifications;
CREATE POLICY "Recruiter notifies applicants"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  type IN ('application_decision', 'application_status', 'interview_invite', 'message')
  AND EXISTS (
    SELECT 1
    FROM applications a
    JOIN jobs j ON j.id = a.job_id
    WHERE a.user_id = notifications.user_id
      AND j.posted_by = auth.uid()
  )
);

-- 3) has_role: switch to SECURITY INVOKER (user_roles has a self-read policy for authenticated)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
