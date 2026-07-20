CREATE TABLE public.anon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID NOT NULL,
  run_type TEXT NOT NULL,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX anon_usage_device_date_idx ON public.anon_usage(device_id, run_date);
ALTER TABLE public.anon_usage ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.anon_usage TO service_role;

CREATE OR REPLACE FUNCTION public.check_and_consume_anon_quota(_device_id uuid, _run_type text, _daily_limit int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count int;
BEGIN
  SELECT count(*) INTO _count FROM public.anon_usage
    WHERE device_id = _device_id AND run_date = CURRENT_DATE;
  IF _count >= _daily_limit THEN
    RAISE EXCEPTION 'ANON_QUOTA_EXCEEDED';
  END IF;
  INSERT INTO public.anon_usage (device_id, run_type) VALUES (_device_id, _run_type);
END;
$$;
REVOKE ALL ON FUNCTION public.check_and_consume_anon_quota(uuid, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_and_consume_anon_quota(uuid, text, int) TO anon, authenticated;
