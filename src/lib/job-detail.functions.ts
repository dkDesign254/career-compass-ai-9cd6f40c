import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { scoreJob } from "./job-scoring";

export const getJobDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const [jobRes, profileRes, appRes] = await Promise.all([
      supabase
        .from("jobs")
        .select("*, companies(name, logo_url, website, description)")
        .eq("id", data.id)
        .single(),
      supabase.from("career_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("applications")
        .select("id, status, created_at")
        .eq("user_id", userId)
        .eq("job_id", data.id)
        .maybeSingle(),
    ]);
    if (jobRes.error) throw new Error(jobRes.error.message);
    const job = jobRes.data;
    const score = scoreJob(job, profileRes.data);
    return { job, score, application: appRes.data ?? null, hasProfile: !!profileRes.data };
  });
