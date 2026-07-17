-- Firecrawl is a scraping service, not an LLM — it should never be picked
-- as a candidate in the general text-generation fallback pool. Add an
-- explicit category so the pools stay correctly scoped as more providers
-- (embeddings, image gen, etc.) get added later.
ALTER TABLE public.ai_provider_keys
  ADD COLUMN category TEXT NOT NULL DEFAULT 'llm'; -- llm | scraping

UPDATE public.ai_provider_keys SET category = 'scraping' WHERE provider = 'firecrawl';

CREATE OR REPLACE FUNCTION public.get_next_ai_key()
RETURNS TABLE(provider text, api_key text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, vault
AS $$
  SELECT k.provider, s.decrypted_secret
  FROM public.ai_provider_keys k
  JOIN vault.decrypted_secrets s ON s.id = k.vault_secret_id
  WHERE k.is_active = true
    AND k.category = 'llm'
    AND (k.cooldown_until IS NULL OR k.cooldown_until < now())
  ORDER BY k.priority ASC, k.last_used_at ASC NULLS FIRST
  LIMIT 1;
$$;
