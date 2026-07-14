-- Extend ai_provider_keys with priority ordering + basic circuit-breaker health tracking
ALTER TABLE public.ai_provider_keys
  ADD COLUMN priority INTEGER NOT NULL DEFAULT 100, -- lower tries first
  ADD COLUMN consecutive_failures INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN last_used_at TIMESTAMPTZ,
  ADD COLUMN last_success_at TIMESTAMPTZ,
  ADD COLUMN last_error TEXT,
  ADD COLUMN last_error_at TIMESTAMPTZ,
  ADD COLUMN cooldown_until TIMESTAMPTZ;

-- Replace set_ai_provider_key to also accept a priority
DROP FUNCTION IF EXISTS public.set_ai_provider_key(text, text, text);

CREATE FUNCTION public.set_ai_provider_key(_provider text, _label text, _key_value text, _priority integer DEFAULT 100)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  _existing_secret_id uuid;
  _new_secret_id uuid;
  _preview text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;
  IF length(_key_value) < 6 THEN
    RAISE EXCEPTION 'Key value looks too short to be valid.';
  END IF;

  _preview := right(_key_value, 4);
  SELECT vault_secret_id INTO _existing_secret_id FROM public.ai_provider_keys WHERE provider = _provider;

  IF _existing_secret_id IS NOT NULL THEN
    PERFORM vault.update_secret(_existing_secret_id, _key_value);
    UPDATE public.ai_provider_keys
      SET label = _label, key_preview = _preview, is_active = true, priority = _priority,
          consecutive_failures = 0, cooldown_until = NULL,
          updated_by = auth.uid(), updated_at = now()
      WHERE provider = _provider;
  ELSE
    _new_secret_id := vault.create_secret(_key_value, _provider, 'AI/automation provider key for ' || _provider);
    INSERT INTO public.ai_provider_keys (provider, label, vault_secret_id, key_preview, is_active, priority, updated_by)
    VALUES (_provider, _label, _new_secret_id, _preview, true, _priority, auth.uid())
    ON CONFLICT (provider) DO UPDATE
      SET label = excluded.label, vault_secret_id = excluded.vault_secret_id,
          key_preview = excluded.key_preview, is_active = true, priority = excluded.priority,
          updated_by = excluded.updated_by, updated_at = now();
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity_type, metadata)
  VALUES (auth.uid(), 'set_ai_provider_key', 'ai_provider_keys', jsonb_build_object('provider', _provider, 'priority', _priority));
END;
$$;
REVOKE ALL ON FUNCTION public.set_ai_provider_key(text,text,text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_ai_provider_key(text,text,text,integer) TO authenticated;

-- Admin RPC to just reorder priority without rotating the key
CREATE FUNCTION public.set_ai_provider_priority(_provider text, _priority integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;
  UPDATE public.ai_provider_keys SET priority = _priority, updated_by = auth.uid(), updated_at = now()
    WHERE provider = _provider;
END;
$$;
REVOKE ALL ON FUNCTION public.set_ai_provider_priority(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_ai_provider_priority(text,integer) TO authenticated;

-- Core routing function: returns the best available key's decrypted value.
-- SERVICE ROLE ONLY. Never exposed to authenticated/anon — this returns raw
-- secret material and must only ever be called from trusted server code that
-- itself connects using the service_role key (never from a client-facing RPC path).
CREATE FUNCTION public.get_next_ai_key()
RETURNS TABLE(provider text, api_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT k.provider, s.decrypted_secret
  FROM public.ai_provider_keys k
  JOIN vault.decrypted_secrets s ON s.id = k.vault_secret_id
  WHERE k.is_active = true
    AND (k.cooldown_until IS NULL OR k.cooldown_until < now())
  ORDER BY k.priority ASC, k.last_used_at ASC NULLS FIRST
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_next_ai_key() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_next_ai_key() TO service_role;

-- Bookkeeping: server code calls this after each attempt to update health/failover state.
CREATE FUNCTION public.report_ai_key_result(_provider text, _success boolean, _error_message text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _success THEN
    UPDATE public.ai_provider_keys
      SET last_used_at = now(), last_success_at = now(), consecutive_failures = 0, cooldown_until = NULL
      WHERE provider = _provider;
  ELSE
    UPDATE public.ai_provider_keys
      SET last_used_at = now(), last_error = _error_message, last_error_at = now(),
          consecutive_failures = consecutive_failures + 1,
          cooldown_until = CASE WHEN consecutive_failures + 1 >= 3 THEN now() + interval '15 minutes' ELSE cooldown_until END
      WHERE provider = _provider;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.report_ai_key_result(text,boolean,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.report_ai_key_result(text,boolean,text) TO service_role;
