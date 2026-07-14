// Server-only. Picks the best available AI provider key (by admin-set priority,
// skipping any in cooldown after repeated failures) and reports back the result
// so the circuit breaker can route around a failing/rate-limited key next time.
//
// Usage from any future AI feature (resume parsing, coaching chat, recommendations):
//
//   import { withAiProviderKey } from "@/lib/ai-provider.server";
//
//   const result = await withAiProviderKey(async (provider, apiKey) => {
//     if (provider === "openai") return callOpenAi(apiKey, prompt);
//     if (provider === "gemini") return callGemini(apiKey, prompt);
//     if (provider === "anthropic") return callAnthropic(apiKey, prompt);
//     throw new Error(`No handler wired for provider: ${provider}`);
//   });
//
// withAiProviderKey automatically tries the next-best key if the callback throws,
// up to `maxAttempts` distinct providers, and records success/failure against
// each key it tries so /admin/settings reflects real health.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export class NoAiProviderKeyError extends Error {
  constructor() {
    super("No active AI provider key is available. Add one at /admin/settings.");
    this.name = "NoAiProviderKeyError";
  }
}

export async function withAiProviderKey<T>(
  callback: (provider: string, apiKey: string) => Promise<T>,
  opts: { maxAttempts?: number } = {},
): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 3;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabaseAdmin.rpc("get_next_ai_key");
    if (error) throw new Error(`Failed to look up AI provider key: ${error.message}`);
    const row = data?.[0];
    if (!row) {
      if (attempt === 0) throw new NoAiProviderKeyError();
      throw lastError instanceof Error ? lastError : new NoAiProviderKeyError();
    }

    try {
      const result = await callback(row.provider, row.api_key);
      await supabaseAdmin.rpc("report_ai_key_result", { _provider: row.provider, _success: true });
      return result;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      await supabaseAdmin.rpc("report_ai_key_result", {
        _provider: row.provider,
        _success: false,
        _error_message: message.slice(0, 500),
      });
      // loop again — get_next_ai_key will now skip this provider if it just
      // tripped the circuit breaker, or keep trying it if it hasn't yet
      continue;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All AI provider key attempts failed.");
}
