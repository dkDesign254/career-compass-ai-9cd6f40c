import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listOpenJobs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        q: z.string().optional(),
        work_mode: z.enum(["remote", "hybrid", "onsite"]).optional(),
        employment_type: z.string().optional(),
        location: z.string().optional(),
      })
      .parse(input ?? {}),
  )
  .handler(async ({ context, data }) => {
    const { supabase } = context as any;
    let q = supabase
      .from("jobs")
      .select("id, title, location, work_mode, employment_type, salary_min, salary_max, salary_currency, deadline, created_at, application_count, application_cap, company_id, companies(name, logo_url)")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(60);
    if (data.work_mode) q = q.eq("work_mode", data.work_mode);
    if (data.employment_type) q = q.eq("employment_type", data.employment_type);
    if (data.location) q = q.ilike("location", `%${data.location}%`);
    if (data.q) q = q.ilike("title", `%${data.q}%`);
    const { data: jobs, error } = await q;
    if (error) throw new Error(error.message);
    return jobs ?? [];
  });

export const getJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context as any;
    const { data: job, error } = await supabase
      .from("jobs")
      .select("*, companies(name, logo_url, website, description)")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return job;
  });

export const applyToJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ jobId: z.string().uuid(), resumeId: z.string().uuid().optional(), notes: z.string().max(2000).optional() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const { data: job, error: jErr } = await supabase
      .from("jobs")
      .select("id, status, application_count, application_cap")
      .eq("id", data.jobId)
      .single();
    if (jErr) throw new Error(jErr.message);
    if (job.status !== "open") throw new Error("This role is no longer accepting applications.");
    if (job.application_cap && job.application_count >= job.application_cap) {
      throw new Error("Application cap reached for this role.");
    }
    const { data: dup } = await supabase
      .from("applications")
      .select("id")
      .eq("user_id", userId)
      .eq("job_id", data.jobId)
      .maybeSingle();
    if (dup) throw new Error("You've already applied to this role.");

    const { data: app, error } = await supabase
      .from("applications")
      .insert({
        user_id: userId,
        job_id: data.jobId,
        resume_id: data.resumeId ?? null,
        notes: data.notes ?? null,
        status: "applied",
        applied_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await supabase
      .from("jobs")
      .update({ application_count: (job.application_count ?? 0) + 1 })
      .eq("id", data.jobId);
    return { id: app.id };
  });

export const listMyApplications = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data, error } = await supabase
      .from("applications")
      .select("id, status, applied_at, created_at, job_id, jobs(title, location, work_mode, companies(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const listMyResumes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data } = await supabase
      .from("resumes")
      .select("id, file_name, file_path, target_role, ats_score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10);
    return data ?? [];
  });

export const getMyRoles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    return (data ?? []).map((r: any) => r.role) as string[];
  });