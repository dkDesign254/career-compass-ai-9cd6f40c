import { createFileRoute } from "@tanstack/react-router";

// Cron-callable public endpoint. Auth = Supabase publishable key in `apikey` header
// (same pattern documented for /api/public/hooks/*). Rejects other callers.
export const Route = createFileRoute("/api/public/hooks/scrape-jobs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!expected || apikey !== expected) {
          return new Response("unauthorized", { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { scrapeJobsFromUrl } = await import("@/lib/scrape.server");
        const { data: sources } = await supabaseAdmin
          .from("job_sources")
          .select("*")
          .eq("enabled", true);
        const results: any[] = [];
        for (const s of sources ?? []) {
          try {
            const jobs = await scrapeJobsFromUrl(s.base_url);
            const rows = jobs.map((j) => {
              const base = (j.url ?? "") + "|" + j.title;
              let h = 0;
              for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) | 0;
              return {
                source: s.name,
                source_url: j.url ?? s.base_url,
                external_id: `${s.name}:${Math.abs(h).toString(36)}`,
                title: j.title.slice(0, 200),
                description: j.description?.slice(0, 4000) ?? null,
                location: j.location?.slice(0, 200) ?? s.region ?? null,
                is_scraped: true,
                scraped_at: new Date().toISOString(),
                status: "open",
              };
            });
            if (rows.length) {
              await supabaseAdmin.from("jobs").upsert(rows, { onConflict: "source,external_id" });
            }
            await supabaseAdmin.from("job_sources").update({
              last_scraped_at: new Date().toISOString(),
              last_status: `ok (${rows.length})`,
              last_error: null,
            }).eq("id", s.id);
            results.push({ source: s.name, count: rows.length });
          } catch (e: any) {
            await supabaseAdmin.from("job_sources").update({
              last_scraped_at: new Date().toISOString(),
              last_status: "error",
              last_error: (e?.message ?? String(e)).slice(0, 500),
            }).eq("id", s.id);
            results.push({ source: s.name, error: e?.message ?? String(e) });
          }
        }
        return Response.json({ ok: true, results });
      },
    },
  },
});