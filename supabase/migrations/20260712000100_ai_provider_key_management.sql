-- Registry of AI/automation provider keys. The raw secret value is never
-- stored here; it lives encrypted in Supabase Vault, referenced by vault_secret_id.
CREATE TABLE public.ai_provider_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL UNIQUE, -- e.g. 'openai', 'gemini', 'anthropic', 'firecrawl'
  label TEXT,
  vault_secret_id UUID,
  key_preview TEXT, -- last 4 chars only, for display
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_provider_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage provider keys" ON public.ai_provider_keys
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER ai_provider_keys_updated_at BEFORE UPDATE ON public.ai_provider_keys
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- Admin-only RPC to set or rotate a provider key. SECURITY DEFINER is required
-- here because only postgres/service_role can write to vault.secrets, but the
-- function itself enforces the admin check before touching the vault at all.
CREATE OR REPLACE FUNCTION public.set_ai_provider_key(_provider text, _label text, _key_value text)
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
      SET label = _label, key_preview = _preview, is_active = true, updated_by = auth.uid(), updated_at = now()
      WHERE provider = _provider;
  ELSE
    _new_secret_id := vault.create_secret(_key_value, _provider, 'AI/automation provider key for ' || _provider);
    INSERT INTO public.ai_provider_keys (provider, label, vault_secret_id, key_preview, is_active, updated_by)
    VALUES (_provider, _label, _new_secret_id, _preview, true, auth.uid())
    ON CONFLICT (provider) DO UPDATE
      SET label = excluded.label, vault_secret_id = excluded.vault_secret_id,
          key_preview = excluded.key_preview, is_active = true,
          updated_by = excluded.updated_by, updated_at = now();
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity_type, metadata)
  VALUES (auth.uid(), 'set_ai_provider_key', 'ai_provider_keys', jsonb_build_object('provider', _provider));
END;
$$;
REVOKE ALL ON FUNCTION public.set_ai_provider_key(text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_ai_provider_key(text,text,text) TO authenticated;

-- Admin-only RPC to deactivate a key without deleting its history.
CREATE OR REPLACE FUNCTION public.deactivate_ai_provider_key(_provider text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admin access required.';
  END IF;
  UPDATE public.ai_provider_keys SET is_active = false, updated_by = auth.uid(), updated_at = now()
    WHERE provider = _provider;
  INSERT INTO public.audit_log (actor_id, action, entity_type, metadata)
  VALUES (auth.uid(), 'deactivate_ai_provider_key', 'ai_provider_keys', jsonb_build_object('provider', _provider));
END;
$$;
REVOKE ALL ON FUNCTION public.deactivate_ai_provider_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deactivate_ai_provider_key(text) TO authenticated;
