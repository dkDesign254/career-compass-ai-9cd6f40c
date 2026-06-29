-- Add minimal columns the AI module flows need
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS raw_text TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS target_role TEXT;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS ats_score INTEGER;
ALTER TABLE public.resumes ADD COLUMN IF NOT EXISTS analysis JSONB;
ALTER TABLE public.career_profiles ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '{}'::jsonb;
-- Make sure recommendations is non-null going forward
UPDATE public.career_profiles SET recommendations = '{}'::jsonb WHERE recommendations IS NULL;