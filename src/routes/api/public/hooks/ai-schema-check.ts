import { createFileRoute } from "@tanstack/react-router";

// TEMPORARY — verifies generateStructured() actually handles a complex
// nested schema (array of objects, mixed types) now that the JSON Schema
// is embedded in the prompt. Uses the same shape that was failing in
// production (career_paths: array of objects with a nested string array).
// Remove after confirming.
export const Route = createFileRoute("/api/public/hooks/ai-schema-check")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apikey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }
        const { getAiModel, reportAiResult, generateStructured } = await import("@/lib/ai-model.server");
        const { z } = await import("zod");

        const TestSchema = z.object({
          career_paths: z.array(
            z.object({
              title: z.string(),
              fit_score: z.number().min(0).max(100),
              why: z.string(),
              first_90_days: z.array(z.string()).max(5),
            }),
          ).max(3),
          upskilling: z.array(z.string()).max(4),
          networking: z.array(z.string()).max(3),
        });

        try {
          const { provider, model } = await getAiModel();
          const result = await generateStructured({
            model,
            schema: TestSchema,
            system: "You are a career strategist. Recommend career paths for the candidate.",
            prompt: "Candidate: final-year CS student, skills in JavaScript, React, Python, SQL. Target role: Software Engineering.",
          });
          await reportAiResult(provider, true);
          return Response.json({ ok: true, provider, result });
        } catch (err: any) {
          return Response.json({ ok: false, error: err?.message ?? String(err) }, { status: 500 });
        }
      },
    },
  },
});
