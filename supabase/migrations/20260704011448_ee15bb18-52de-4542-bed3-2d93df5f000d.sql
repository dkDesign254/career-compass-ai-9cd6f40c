-- Ensure the (source, external_id) unique constraint is visible to PostgREST.
-- Drop and recreate cleanly, then force a schema cache reload.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_source_external_id_key;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_source_external_id_key UNIQUE (source, external_id);
NOTIFY pgrst, 'reload schema';