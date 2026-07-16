import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Public, read-only preview of the latest open jobs for the landing page.
// Uses the service-role client server-side; only projects safe columns.
export const getPublicJobsPreview = createServerFn({ method: "GET" })
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("jobs")
      .select("id,title,location,source,created_at,is_scraped,description")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(6);
    if (error) return [] as Array<{ id: string; title: string; location: string | null; source: string | null; created_at: string; is_scraped: boolean; description: string | null }>;
    return (data ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      location: (r.location as string | null) ?? null,
      source: (r.source as string | null) ?? null,
      created_at: r.created_at as string,
      is_scraped: Boolean(r.is_scraped),
      description: (r.description as string | null)?.slice(0, 160) ?? null,
    }));
  });

// Full public job browsing — no login required. Anyone can see every open
// role; signing in is only required to actually apply.
export const getPublicJobsList = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    q: z.string().optional(),
    work_mode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  }).parse(i ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("jobs")
      .select("id,title,location,work_mode,employment_type,salary_min,salary_max,salary_currency,source,is_scraped,created_at,companies(name,logo_url)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.q) query = query.ilike("title", `%${data.q}%`);
    if (data.work_mode) query = query.eq("work_mode", data.work_mode);
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const getPublicJobDetail = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: job, error } = await supabaseAdmin
      .from("jobs")
      .select("*, companies(name, logo_url, website, description)")
      .eq("id", data.id)
      .eq("status", "open")
      .single();
    if (error) throw new Error("This role isn't available anymore.");
    return job;
  });