// Replaces Lovable's proprietary AI gateway (ai.gateway.lovable.dev, requires a
// Lovable Cloud workspace + LOVABLE_API_KEY) with the app's own Vault-backed key
// system. Picks the highest-priority active provider key via get_next_ai_key(),
// builds the right AI SDK client for it, and reports success/failure back for
// the circuit breaker (see src/lib/ai-provider.server.ts for the same pattern
// used elsewhere).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export class NoAiProviderKeyError extends Error {
  constructor() {
    super("No active AI provider key is configured. Add one at /admin/settings.");
    this.name = "NoAiProviderKeyError";
  }
}

// OpenAI-compatible base URLs for each supported provider. Anthropic isn't listed
// here — it doesn't offer a standard OpenAI-compatible endpoint — add
// @ai-sdk/anthropic directly if/when an Anthropic key is added.
const PROVIDER_CONFIG: Record<string, { baseURL: string; model: string }> = {
  gemini: { baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-3.5-flash" },
  openai: { baseURL: "https://api.openai.com/v1", model: "gpt-5-mini" },
};

export async function getAiModel() {
  const { data, error } = await supabaseAdmin.rpc("get_next_ai_key");
  if (error) throw new Error(`AI key lookup failed: ${error.message}`);
  const row = data?.[0];
  if (!row) throw new NoAiProviderKeyError();

  const config = PROVIDER_CONFIG[row.provider];
  if (!config) {
    throw new Error(`"${row.provider}" is configured but not wired to a model yet. Supported: ${Object.keys(PROVIDER_CONFIG).join(", ")}.`);
  }

  const client = createOpenAICompatible({
    name: row.provider,
    baseURL: config.baseURL,
    headers: { Authorization: `Bearer ${row.api_key}` },
  });

  // The generic OpenAI-compatible wrapper doesn't know a given provider
  // supports real structured outputs (response_format: json_schema) unless
  // told explicitly — without this it falls back to a much less reliable
  // prompt-and-hope approach, which is what was causing "could not parse
  // the response" / "response did not match schema" errors against Gemini.
  const modelInstance = client.languageModel(config.model, { supportsStructuredOutputs: true });

  return { provider: row.provider, model: modelInstance };
}

export async function reportAiResult(provider: string, success: boolean, errorMessage?: string) {
  await supabaseAdmin.rpc("report_ai_key_result", {
    _provider: provider,
    _success: success,
    _error_message: errorMessage?.slice(0, 500) ?? null,
  });
}

export class AiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function mapAiError(err: unknown): AiRequestError {
  const msg = err instanceof Error ? err.message : String(err);
  const status =
    typeof err === "object" && err !== null && "statusCode" in err
      ? Number((err as { statusCode: unknown }).statusCode) || 500
      : /429/.test(msg) ? 429 : /402|billing|quota/i.test(msg) ? 402 : 500;
  if (status === 429) return new AiRequestError(429, "AI is busy right now. Please try again in a moment.");
  if (status === 402) return new AiRequestError(402, "The configured AI provider key has run out of quota or credits.");
  return new AiRequestError(status, msg || "AI request failed.");
}
