// Replaces Lovable's proprietary AI gateway (ai.gateway.lovable.dev, requires a
// Lovable Cloud workspace + LOVABLE_API_KEY) with the app's own Vault-backed key
// system. Picks the highest-priority active provider key via get_next_ai_key(),
// builds the right AI SDK client for it, and reports success/failure back for
// the circuit breaker (see src/lib/ai-provider.server.ts for the same pattern
// used elsewhere).
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
import type { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
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

  // NOTE: previously tried forcing supportsStructuredOutputs: true here to
  // get real response_format: json_schema support. Confirmed via production
  // logs this was wrong — Gemini's OpenAI-compatible endpoint (at least as
  // exposed through this SDK/provider combination) doesn't actually support
  // that feature: "AI SDK Warning (gemini.chat / gemini-3.5-flash): The
  // feature 'responseFormat' is not supported". Using the plain callable
  // form and doing structured output manually via generateStructured()
  // below instead — provider-agnostic, doesn't depend on any specific
  // response-format capability.
  return { provider: row.provider, model: client(config.model) };
}

// Provider-agnostic structured output: asks for raw JSON via prompt
// instructions instead of relying on a provider-specific response_format
// feature, then parses and validates it with the given Zod schema. Retries
// once with the validation error fed back to the model if the first
// attempt doesn't parse or doesn't match the schema.
// Recursively walks a parsed JSON value and converts any string that looks
// exactly like a number ("85", "3.5") into an actual number. Leaves
// non-numeric strings, booleans, nulls, etc. untouched. This is applied
// before schema validation so a model's habit of quoting numbers doesn't
// fail an otherwise-correct response.
function coerceNumericStrings(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(coerceNumericStrings);
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = coerceNumericStrings(v);
    }
    return out;
  }
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return value;
}

export async function generateStructured<T>(params: {
  model: any;
  schema: z.ZodType<T>;
  system: string;
  prompt: string;
}): Promise<T> {
  // Root cause found via live production testing: previous versions of this
  // function asked the model for "raw JSON" without ever telling it what
  // shape that JSON needed to be — no field names, no nesting, nothing. The
  // model was left to guess the structure purely from prose instructions,
  // which works for simple schemas but reliably falls apart on anything with
  // nested objects or arrays-of-objects (confirmed: real failures included
  // arrays of objects coming back as arrays of plain strings, and vice
  // versa). Generating the actual JSON Schema from the Zod schema and
  // embedding it verbatim in the prompt gives the model an unambiguous spec
  // to follow instead of a guess.
  const jsonSchema = zodToJsonSchema(params.schema, { target: "openApi3" });
  const jsonInstruction =
    `\n\nRespond with ONLY a single raw JSON object that strictly matches this JSON Schema — every field, exactly these names, exactly these types (arrays of objects must be arrays of objects, not arrays of strings; numbers must be numbers, not quoted strings):\n\n${JSON.stringify(jsonSchema)}\n\nNo markdown code fences, no commentary before or after — just the JSON object itself, starting with { and ending with }.`;

  const attempt = async (extraContext?: string) => {
    const { text } = await generateText({
      model: params.model,
      system: params.system + jsonInstruction,
      prompt: extraContext ? `${params.prompt}\n\n${extraContext}` : params.prompt,
    });
    // Strip markdown code fences if the model added them anyway, and grab
    // the outermost {...} in case there's stray commentary around it.
    let cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("Response was not valid JSON.");
    }
    // Gemini's JSON output frequently stringifies numbers ("85" instead of
    // 85) even when explicitly asked for raw JSON. Coerce numeric-looking
    // strings back to numbers before validating, rather than failing valid
    // data over a formatting quirk.
    const coerced = coerceNumericStrings(parsed);
    const result = params.schema.safeParse(coerced);
    if (!result.success) {
      throw new Error(`Response did not match the expected structure: ${result.error.message}`);
    }
    return result.data;
  };

  try {
    return await attempt();
  } catch (firstErr) {
    // One retry, telling the model exactly what went wrong so it can self-correct.
    const message = firstErr instanceof Error ? firstErr.message : String(firstErr);
    return await attempt(`Your previous response failed with: "${message}". Fix it and respond again with only the corrected raw JSON object.`);
  }
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
