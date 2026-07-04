import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboardFeed = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const [jobsRes, appsRes, notesRes, profileRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("id, title, location, work_mode, employment_type, created_at, source, companies(name, logo_url)")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("applications")
        .select("id, status, created_at, jobs(id, title, companies(name))")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("notifications")
        .select("id, title, body, created_at, read_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(6),
      supabase
        .from("career_profiles")
        .select("target_roles, target_industries, top_skills, experience_years")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    return {
      jobs: jobsRes.data ?? [],
      applications: appsRes.data ?? [],
      notifications: notesRes.data ?? [],
      profile: profileRes.data ?? null,
    };
  });