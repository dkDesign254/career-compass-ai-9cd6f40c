import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const normMode = (m?: string): "remote" | "hybrid" | "onsite" | null => {
  if (!m) return null;
  const s = m.toLowerCase();
  if (s.includes("remote")) return "remote";
  if (s.includes("hybrid")) return "hybrid";
  if (s.includes("onsite") || s.includes("on-site") || s.includes("on site")) return "onsite";
  return null;
};
const normType = (t?: string): string | null => {
  if (!t) return null;
  const s = t.toLowerCase().replace(/[\s-]/g, "_");
  const allowed = ["full_time", "part_time", "contract", "internship", "temporary"];
  return allowed.find((a) => s.includes(a.split("_")[0])) ?? null;
};
const externalIdFor = (source: string, url?: string, title?: string) => {
  const base = (url ?? "") + "|" + (title ?? "");
  let h = 0;
  for (let i = 0; i < base.length; i++) h = (h * 31 + base.charCodeAt(i)) | 0;
  return `${source}:${Math.abs(h).toString(36)}`;
};

async function assertAdmin(ctx: any) {
  const { supabase, userId } = ctx;
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admin access required.");
}

export const listJobSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase } = context as any;
    const { data, error } = await supabase.from("job_sources").select("*").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const toggleJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), enabled: z.boolean() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { error } = await supabase.from("job_sources").update({ enabled: data.enabled }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ name: z.string().min(2), base_url: z.string().url(), region: z.string().optional() }).parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { error } = await supabase.from("job_sources").insert(data);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(2).optional(),
      base_url: z.string().url().optional(),
      region: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      enabled: z.boolean().optional(),
    }).parse(i),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { id, ...patch } = data;
    const { error } = await supabase.from("job_sources").update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_admin_action", { _action: "update", _entity_type: "job_source", _entity_id: id, _metadata: patch });
    return { ok: true };
  });

export const deleteJobSource = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabase } = context as any;
    const { error } = await supabase.from("job_sources").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabase.rpc("log_admin_action", { _action: "delete", _entity_type: "job_source", _entity_id: data.id, _metadata: {} });
    return { ok: true };
  });

// Admin-triggered scrape. Iterates enabled sources, extracts jobs via Firecrawl,
// upserts by (source, external_id).
export const runJobScrape = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ sourceId: z.string().uuid().optional() }).parse(i ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { scrapeJobsFromUrl } = await import("./scrape.server");

    let q = supabaseAdmin.from("job_sources").select("*").eq("enabled", true);
    if (data.sourceId) q = q.eq("id", data.sourceId);
    const { data: sources, error } = await q;
    if (error) throw new Error(error.message);

    const results: Array<{ source: string; inserted: number; error?: string }> = [];
    for (const s of sources ?? []) {
      try {
        const jobs = await scrapeJobsFromUrl(s.base_url);
        const rows = jobs.map((j) => ({
          source: s.name,
          source_url: j.url ?? s.base_url,
          external_id: externalIdFor(s.name, j.url, j.title),
          title: j.title.slice(0, 200),
          description: j.description?.slice(0, 4000) ?? null,
          location: j.location?.slice(0, 200) ?? s.region ?? null,
          work_mode: normMode(j.work_mode),
          employment_type: normType(j.employment_type),
          is_scraped: true,
          scraped_at: new Date().toISOString(),
          status: "open",
        }));
        let inserted = 0;
        if (rows.length) {
          const { error: upErr, count } = await supabaseAdmin
            .from("jobs")
            .upsert(rows, { onConflict: "source,external_id", count: "exact" });
          if (upErr) throw upErr;
          inserted = count ?? rows.length;
        }
        await supabaseAdmin.from("job_sources").update({
          last_scraped_at: new Date().toISOString(),
          last_status: `ok (${rows.length})`,
          last_error: null,
        }).eq("id", s.id);
        results.push({ source: s.name, inserted });
      } catch (e: any) {
        await supabaseAdmin.from("job_sources").update({
          last_scraped_at: new Date().toISOString(),
          last_status: "error",
          last_error: e?.message?.slice(0, 500) ?? String(e).slice(0, 500),
        }).eq("id", s.id);
        results.push({ source: s.name, inserted: 0, error: e?.message ?? String(e) });
      }
    }
    return { results };
  });

// Admin dry-run: scrape a URL and return the first ~10 jobs without touching the DB.
// Powers the "Preview" wizard in /admin/scraping.
export const testScrapeUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ url: z.string().url() }).parse(i))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { scrapeJobsFromUrl } = await import("./scrape.server");
    try {
      const jobs = await scrapeJobsFromUrl(data.url);
      return { ok: true as const, count: jobs.length, preview: jobs.slice(0, 10) };
    } catch (e: any) {
      return { ok: false as const, error: (e?.message ?? String(e)).slice(0, 500), preview: [] };
    }
  });