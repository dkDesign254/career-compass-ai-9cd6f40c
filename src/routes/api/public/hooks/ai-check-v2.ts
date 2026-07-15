import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY — verifies getAiModel() reaches a real provider end to end.
// Remove after confirming.
export const Route = createFileRoute("/api/public/hooks/ai-check-v2")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apikey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }
        const { getAiModel, reportAiResult } = await import("@/lib/ai-model.server");
        const { generateText } = await import("ai");
        try {
          const { provider, model } = await getAiModel();
          const { text } = await generateText({
            model,
            prompt: "Reply with exactly the two words: WIRING OK",
          });
          await reportAiResult(provider, true);
          return Response.json({ ok: true, provider, text });
        } catch (err: any) {
          return Response.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
        }
      },
    },
  },
});
