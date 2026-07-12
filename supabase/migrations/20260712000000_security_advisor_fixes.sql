-- 1) Fix: public/authenticated can execute SECURITY DEFINER log_admin_action.
-- Switch to SECURITY INVOKER and gate the actual insert with an RLS policy
-- restricted to admins, so the function has no elevated privilege to abuse.
DROP FUNCTION IF EXISTS public.log_admin_action(text, text, uuid, jsonb);

CREATE POLICY "Admins insert audit" ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE FUNCTION public.log_admin_action(
  _action text, _entity_type text, _entity_id uuid, _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO public.audit_log (actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), _action, _entity_type, _entity_id, _metadata);
$$;
REVOKE ALL ON FUNCTION public.log_admin_action(text,text,uuid,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_admin_action(text,text,uuid,jsonb) TO authenticated;

-- 2) Fix: companies.owner_id (internal user reference) was readable by anyone
-- via the public "Companies public read" policy since RLS is row-level only,
-- not column-level. Lock the column down explicitly; nothing in the app
-- ever selects owner_id, so this is safe.
REVOKE SELECT ON public.companies FROM anon, authenticated;
GRANT SELECT (id, name, slug, website, logo_url, description, industry, size, headquarters, usaid_partner, verified, created_at, updated_at)
  ON public.companies TO anon, authenticated;

-- 3) Move pg_net out of the public schema (best practice; Supabase-managed
-- extension, so this may be a no-op if the platform pins its schema).
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$
BEGIN
  ALTER EXTENSION pg_net SET SCHEMA extensions;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_net schema move skipped: %', SQLERRM;
END $$;
