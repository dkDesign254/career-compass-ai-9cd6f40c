-- Unlike get_next_ai_key() (priority fallback across interchangeable LLM providers),
-- this looks up one specific named provider's key — for services like Firecrawl that
-- aren't interchangeable with an LLM provider. Service_role only, same reasoning as
-- get_next_ai_key(): returns raw secret material, must never reach authenticated/anon.
CREATE FUNCTION public.get_provider_key(_provider text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT s.decrypted_secret
  FROM public.ai_provider_keys k
  JOIN vault.decrypted_secrets s ON s.id = k.vault_secret_id
  WHERE k.provider = _provider AND k.is_active = true
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_provider_key(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_provider_key(text) TO service_role;
