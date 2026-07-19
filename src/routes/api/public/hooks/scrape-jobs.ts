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
          const [{ data: profiles }, { data: alertPrefs }] = await Promise.all([
            supabaseAdmin.from("career_profiles").select("user_id, target_role, industry"),
            supabaseAdmin.from("job_alert_preferences").select("user_id, keywords, work_modes").eq("enabled", true),
          ]);

          // user_id -> { count, reasons: string[] } so a user with both a
          // matching target_role AND a matching keyword alert gets ONE
          // notification, not two.
          const perUser = new Map<string, { count: number; reasons: Set<string> }>();
          const bump = (userId: string, count: number, reason: string) => {
            const cur = perUser.get(userId) ?? { count: 0, reasons: new Set<string>() };
            cur.count = Math.max(cur.count, count);
            cur.reasons.add(reason);
            perUser.set(userId, cur);
          };

          for (const p of profiles ?? []) {
            if (!p.target_role) continue;
            const roleWord = p.target_role.split(" ")[0]?.toLowerCase();
            const matches = newlyInsertedJobs.filter((j: any) => roleWord && j.title?.toLowerCase().includes(roleWord));
            if (matches.length > 0) bump(p.user_id, matches.length, `"${p.target_role}"`);
          }

          for (const alert of alertPrefs ?? []) {
            const keywords: string[] = Array.isArray(alert.keywords) ? alert.keywords : [];
            if (keywords.length === 0) continue;
            const matches = newlyInsertedJobs.filter((j: any) =>
              keywords.some((kw) => j.title?.toLowerCase().includes(kw.toLowerCase())),
            );
            if (matches.length > 0) bump(alert.user_id, matches.length, keywords.map((k) => `"${k}"`).join(", "));
          }

          const notifRows = [...perUser.entries()].map(([user_id, { count, reasons }]) => ({
            user_id,
            type: "new_jobs",
            title: `${count} new job${count === 1 ? " matches" : "s match"} your alerts`,
            body: `New listings matching ${[...reasons].join(" and ")} were just added to the board.`,
            link: "/jobs",
            read: false,
          }));
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