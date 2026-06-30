import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const FREE_JOB_APP_CAP = 30;

async function assertRecruiter(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "recruiter" });
  if (error) throw new Error(error.message);
  const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  const { data: isCA } = await supabase.rpc("has_role", { _user_id: userId, _role: "company_admin" });
  if (!data && !isAdmin && !isCA) throw new Error("Recruiter access required.");
}

export const becomeRecruiter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "recruiter" });
    if (error && !`${error.message}`.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const listMyJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    await assertRecruiter(supabase, userId);
    const { data, error } = await supabase
      .from("jobs")
      .select("id, title, location, work_mode, employment_type, status, application_count, application_cap, deadline, created_at, company_id, companies(name)")
      .eq("posted_by", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const CreateJobSchema = z.object({
  title: z.string().min(2).max(160),
  company_name: z.string().min(1).max(160),
  description: z.string().min(20).max(20000),
  requirements: z.string().max(10000).optional(),
  location: z.string().max(160).optional(),
  work_mode: z.enum(["remote", "hybrid", "onsite"]).optional(),
  employment_type: z.enum(["full_time", "part_time", "contract", "internship"]).optional(),
  salary_min: z.number().int().min(0).optional(),
  salary_max: z.number().int().min(0).optional(),
  salary_currency: z.string().max(8).optional(),
  skills: z.array(z.string()).max(30).optional(),
  deadline: z.string().optional(),
});

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateJobSchema.parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertRecruiter(supabase, userId);

    // Find or create company owned by recruiter
    let companyId: string | null = null;
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .ilike("name", data.company_name)
      .maybeSingle();
    if (existing) companyId = existing.id;
    else {
      const { data: created, error: cErr } = await supabase
        .from("companies")
        .insert({ name: data.company_name, owner_id: userId })
        .select("id")
        .single();
      if (cErr) throw new Error(cErr.message);
      companyId = created.id;
    }

    const { data: job, error } = await supabase
      .from("jobs")
      .insert({
        title: data.title,
        description: data.description,
        requirements: data.requirements ?? null,
        location: data.location ?? null,
        work_mode: data.work_mode ?? null,
        employment_type: data.employment_type ?? null,
        salary_min: data.salary_min ?? null,
        salary_max: data.salary_max ?? null,
        salary_currency: data.salary_currency ?? "USD",
        skills: data.skills ?? [],
        deadline: data.deadline || null,
        source: "internal",
        status: "open",
        posted_by: userId,
        company_id: companyId,
        application_cap: FREE_JOB_APP_CAP,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: job.id };
  });

export const listApplicants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertRecruiter(supabase, userId);
    // Verify ownership
    const { data: job, error: jErr } = await supabase
      .from("jobs")
      .select("id, title, application_count, application_cap, posted_by")
      .eq("id", data.jobId)
      .single();
    if (jErr) throw new Error(jErr.message);
    if (job.posted_by !== userId) throw new Error("Forbidden");

    const { data: apps, error } = await supabase
      .from("applications")
      .select("id, status, match_score, match_analysis, notes, applied_at, created_at, user_id, resume_id, resumes(file_path, file_name, ats_score)")
      .eq("job_id", data.jobId)
      .order("match_score", { ascending: false, nullsFirst: false });
    if (error) throw new Error(error.message);

    // Fetch profile names (admin client used to bypass RLS limitations)
    const ids = (apps ?? []).map((a: any) => a.user_id);
    let profiles: Record<string, { full_name: string | null }> = {};
    if (ids.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: ps } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids);
      profiles = Object.fromEntries((ps ?? []).map((p: any) => [p.id, { full_name: p.full_name }]));
    }
    return {
      job,
      applicants: (apps ?? []).map((a: any) => ({ ...a, applicant: profiles[a.user_id] ?? { full_name: null } })),
    };
  });

export const decideApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        applicationId: z.string().uuid(),
        decision: z.enum(["proceed", "regret", "shortlist"]),
        message: z.string().min(5).max(4000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await assertRecruiter(supabase, userId);
    // Verify recruiter owns the job for this application
    const { data: app, error: aErr } = await supabase
      .from("applications")
      .select("id, user_id, job_id, jobs!inner(id, title, posted_by)")
      .eq("id", data.applicationId)
      .single();
    if (aErr) throw new Error(aErr.message);
    if ((app as any).jobs.posted_by !== userId) throw new Error("Forbidden");

    const nextStatus = data.decision === "proceed" ? "interview" : data.decision === "shortlist" ? "shortlisted" : "rejected";
    const { error: uErr } = await supabase
      .from("applications")
      .update({ status: nextStatus })
      .eq("id", data.applicationId);
    if (uErr) throw new Error(uErr.message);

    const { data: thread, error: tErr } = await supabase
      .from("feedback_threads")
      .insert({ application_id: data.applicationId, decision: data.decision, recruiter_message: data.message })
      .select("id")
      .single();
    if (tErr) throw new Error(tErr.message);

    await supabase.from("feedback_messages").insert({ thread_id: thread.id, sender_id: userId, body: data.message });

    await supabase.from("notifications").insert({
      user_id: (app as any).user_id,
      kind: "application_decision",
      title: `Update on your application: ${(app as any).jobs.title}`,
      body: data.decision === "proceed" ? "You've been invited to the next round." : data.decision === "shortlist" ? "You've been shortlisted." : "The role has been filled by another candidate.",
      link: `/applications`,
    });

    return { threadId: thread.id, status: nextStatus };
  });

export const sendThreadMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ threadId: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const { error } = await supabase
      .from("feedback_messages")
      .insert({ thread_id: data.threadId, sender_id: userId, body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getThread = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ applicationId: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    const { supabase } = context as any;
    const { data: thread } = await supabase
      .from("feedback_threads")
      .select("id, decision, recruiter_message, created_at")
      .eq("application_id", data.applicationId)
      .maybeSingle();
    if (!thread) return { thread: null, messages: [] };
    const { data: messages } = await supabase
      .from("feedback_messages")
      .select("id, sender_id, body, created_at")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    return { thread, messages: messages ?? [] };
  });