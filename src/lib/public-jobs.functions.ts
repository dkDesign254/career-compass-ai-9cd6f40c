import { createServerFn } from "@tanstack/react-start";

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