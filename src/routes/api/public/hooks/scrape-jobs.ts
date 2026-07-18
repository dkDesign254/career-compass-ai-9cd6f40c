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
        const runStartedAt = new Date().toISOString();
        const { data: sources } = await supabaseAdmin
          .from("job_sources")
          .select("*")
          .eq("enabled", true);

        const scrapeOne = async (s: any) => {
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
          return { source: s.name, count: rows.length };
        };

        // Running all sources fully in parallel hit a concurrency limit on the
        // hosting side (confirmed by testing: 1-2 sources concurrently complete
        // in ~20-30s, 5 at once hangs past 90s with no response at all). Batch
        // instead, a small concurrency window per round.
        const BATCH_SIZE = 2;
        const summary: any[] = [];
        const list = sources ?? [];
        for (let i = 0; i < list.length; i += BATCH_SIZE) {
          const batch = list.slice(i, i + BATCH_SIZE);
          const batchResults = await Promise.allSettled(batch.map(scrapeOne));
          batchResults.forEach((r, idx) => {
            const s = batch[idx];
            if (r.status === "fulfilled") {
              summary.push(r.value);
            } else {
              const message = (r.reason?.message ?? String(r.reason)).slice(0, 500);
              supabaseAdmin.from("job_sources").update({
                last_scraped_at: new Date().toISOString(),
                last_status: "error",
                last_error: message,
              }).eq("id", s.id).then(() => {});
              summary.push({ source: s.name, error: message });
            }
          });
        }

        // created_at defaults to now() and is never included in the upsert
        // payload above, so it only changes for rows that were genuinely
        // INSERTed this run — an updated existing row keeps its original
        // created_at. That's the real signal for "actually new," not just
        // "touched by this scrape."
        const { data: newlyInsertedJobs } = await supabaseAdmin
          .from("jobs")
          .select("id, title")
          .eq("status", "open")
          .gte("created_at", runStartedAt);

        let notificationsCreated = 0;
        if (newlyInsertedJobs && newlyInsertedJobs.length > 0) {
          const { data: profiles } = await supabaseAdmin
            .from("career_profiles")
            .select("user_id, target_role, industry");
          const notifRows: any[] = [];
          for (const p of profiles ?? []) {
            if (!p.target_role && !p.industry) continue;
            const roleWord = (p.target_role ?? "").split(" ")[0]?.toLowerCase();
            const matchCount = newlyInsertedJobs.filter((j: any) =>
              (roleWord && j.title?.toLowerCase().includes(roleWord)),
            ).length;
            if (matchCount > 0) {
              notifRows.push({
                user_id: p.user_id,
                type: "new_jobs",
                title: `${matchCount} new job${matchCount === 1 ? " matches" : "s match"} your profile`,
                body: `New listings matching "${p.target_role}" were just added to the board.`,
                link: "/jobs",
                read: false,
              });
            }
          }
          if (notifRows.length > 0) {
            await supabaseAdmin.from("notifications").insert(notifRows);
            notificationsCreated = notifRows.length;
          }
        }

        return Response.json({ ok: true, results: summary, new_jobs: newlyInsertedJobs?.length ?? 0, notifications_created: notificationsCreated });
      },
    },
  },
});