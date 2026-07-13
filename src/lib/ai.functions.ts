import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider, mapGatewayError } from "./ai-gateway.server";

const MODEL = "google/gemini-3-flash-preview";
const FREE_QUOTA = 2;

const QUOTA_TYPES = new Set([
  "employability",
  "skill_gap",
  "resume_ats",
  "recommendations",
  "cover_letter",
  "interview_kit",
]);

type SupabaseClient =
  Awaited<
    ReturnType<typeof import("@/integrations/supabase/client").supabase.auth.getUser>
  > extends never
    ? never
    : any;

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function checkAndConsumeQuota(supabase: any, userId: string, runType: string) {
  if (!QUOTA_TYPES.has(runType)) return;

  // Active paid plan bypasses the free quota.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, plan")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sub && sub.plan && sub.plan !== "free") return;

  const period = monthKey();
  const { count, error: countErr } = await supabase
    .from("ai_run_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("period_month", period);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) >= FREE_QUOTA) {
    throw new Error(`You've used your ${FREE_QUOTA} free AI runs this month. Upgrade to continue.`);
  }

  const { error: insErr } = await supabase
    .from("ai_run_usage")
    .insert({ user_id: userId, run_type: runType, period_month: period });
  if (insErr) throw new Error(insErr.message);
}

function getApiKey() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

async function loadProfile(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("career_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Complete your onboarding first to use this module.");
  return data;
}

function profileSummary(p: any) {
  return [
    `Target role: ${p.target_role ?? "—"}`,
    `Industry: ${p.industry ?? "—"}`,
    `Experience level: ${p.experience_level ?? "—"}`,
    `Locations: ${(p.target_locations ?? []).join(", ") || "—"}`,
    `Skills: ${JSON.stringify(p.skills ?? [])}`,
    `Education: ${JSON.stringify(p.education ?? [])}`,
    `Work history: ${JSON.stringify(p.work_history ?? [])}`,
    `Certifications: ${JSON.stringify(p.certifications ?? [])}`,
    `Goals: ${p.career_goals ?? "—"}`,
  ].join("\n");
}

/* ---------------- Quota status ---------------- */

export const getQuotaStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const period = monthKey();
    const { count } = await supabase
      .from("ai_run_usage")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("period_month", period);
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("status, plan")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    const isPaid = !!(sub && sub.plan && sub.plan !== "free");
    return {
      used: count ?? 0,
      limit: isPaid ? null : FREE_QUOTA,
      isPaid,
    };
  });

/* ---------------- Employability score ---------------- */

const EmployabilitySchema = z.object({
  score: z.number().min(0).max(100).describe("Overall employability score 0-100"),
  breakdown: z.object({
    skills: z.number().min(0).max(100),
    experience: z.number().min(0).max(100),
    education: z.number().min(0).max(100),
    market_fit: z.number().min(0).max(100),
  }),
  strengths: z.array(z.string()).max(5),
  weaknesses: z.array(z.string()).max(5),
  next_actions: z.array(z.string()).max(5),
  summary: z.string(),
});

export const scoreEmployability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const profile = await loadProfile(supabase, userId);
    await checkAndConsumeQuota(supabase, userId, "employability");
    try {
      const gateway = createLovableAiGatewayProvider(getApiKey());
      const { output: aiOutput } = await generateText({
        model: gateway(MODEL),
        output: Output.object({ schema: EmployabilitySchema }),
        system:
          "You are an expert career coach. Produce an honest, evidence-based employability assessment for the candidate based on the profile they provide. Be specific and constructive.",
        prompt: `Candidate profile:\n${profileSummary(profile)}`,
      });
      const result = aiOutput;
      await supabase
        .from("career_profiles")
        .update({ recommendations: { ...(profile.recommendations ?? {}), employability: result } })
        .eq("user_id", userId);
      return result;
    } catch (err) {
      throw mapGatewayError(err);
    }
  });

/* ---------------- Skill-gap analysis ---------------- */

const SkillGapSchema = z.object({
  target_role: z.string(),
  required_skills: z.array(
    z.object({
      name: z.string(),
      importance: z.enum(["critical", "important", "nice_to_have"]),
      have: z.boolean(),
      proficiency_gap: z.string(),
    }),
  ),
  learning_plan: z.array(
    z.object({
      skill: z.string(),
      resources: z.array(z.string()).max(3),
      estimated_weeks: z.number().min(1).max(52),
    }),
  ),
  summary: z.string(),
});

export const analyzeSkillGap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const profile = await loadProfile(supabase, userId);
    await checkAndConsumeQuota(supabase, userId, "skill_gap");
    try {
      const gateway = createLovableAiGatewayProvider(getApiKey());
      const { output: aiOutput } = await generateText({
        model: gateway(MODEL),
        output: Output.object({ schema: SkillGapSchema }),
        system:
          "You are a senior recruiter and career coach. Identify the skills the candidate must build to land their target role and produce a focused learning plan.",
        prompt: `Profile:\n${profileSummary(profile)}\n\nTarget role: ${profile.target_role}.`,
      });
      const result = aiOutput;
      await supabase
        .from("career_profiles")
        .update({ recommendations: { ...(profile.recommendations ?? {}), skill_gap: result } })
        .eq("user_id", userId);
      return result;
    } catch (err) {
      throw mapGatewayError(err);
    }
  });

/* ---------------- Resume / ATS ---------------- */

const ResumeSchema = z.object({
  ats_score: z.number().min(0).max(100),
  keyword_matches: z.array(z.string()).max(20),
  missing_keywords: z.array(z.string()).max(20),
  issues: z.array(z.string()).max(10),
  rewritten_summary: z.string(),
  bullet_suggestions: z.array(z.string()).max(8),
});

export const optimizeResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        resume_text: z.string().min(50).max(20000),
        target_role: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    await checkAndConsumeQuota(supabase, userId, "resume_ats");
    try {
      const gateway = createLovableAiGatewayProvider(getApiKey());
      const { output: aiOutput } = await generateText({
        model: gateway(MODEL),
        output: Output.object({ schema: ResumeSchema }),
        system:
          "You are an ATS expert. Score the resume against the target role, flag issues, and rewrite the summary plus key bullets to be quantified and ATS-friendly.",
        prompt: `Target role: ${data.target_role ?? "general"}\n\nResume:\n${data.resume_text}`,
      });
      const result = aiOutput;
      const { data: row } = await supabase
        .from("resumes")
        .insert({
          user_id: userId,
          raw_text: data.resume_text,
          target_role: data.target_role ?? null,
          ats_score: result.ats_score,
          analysis: result,
        })
        .select("id")
        .single();
      return { id: row?.id, ...result };
    } catch (err) {
      throw mapGatewayError(err);
    }
  });

/* ---------------- Career recommendations ---------------- */

const RecsSchema = z.object({
  career_paths: z
    .array(
      z.object({
        title: z.string(),
        fit_score: z.number().min(0).max(100),
        why: z.string(),
        first_90_days: z.array(z.string()).max(5),
      }),
    )
    .max(5),
  upskilling: z.array(z.string()).max(6),
  networking: z.array(z.string()).max(4),
});

export const recommendCareers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const profile = await loadProfile(supabase, userId);
    await checkAndConsumeQuota(supabase, userId, "recommendations");
    try {
      const gateway = createLovableAiGatewayProvider(getApiKey());
      const { output: aiOutput } = await generateText({
        model: gateway(MODEL),
        output: Output.object({ schema: RecsSchema }),
        system:
          "You are a career strategist. Recommend 3-5 career paths the candidate could pursue, each with a fit score, rationale and an actionable 90-day plan.",
        prompt: `Profile:\n${profileSummary(profile)}`,
      });
      const result = aiOutput;
      await supabase
        .from("career_profiles")
        .update({ recommendations: { ...(profile.recommendations ?? {}), careers: result } })
        .eq("user_id", userId);
      return result;
    } catch (err) {
      throw mapGatewayError(err);
    }
  });

/* ---------------- Cover letter ---------------- */

export const generateCoverLetter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        job_title: z.string().min(2),
        company: z.string().min(1),
        job_description: z.string().min(20).max(8000),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const profile = await loadProfile(supabase, userId);
    await checkAndConsumeQuota(supabase, userId, "cover_letter");
    try {
      const gateway = createLovableAiGatewayProvider(getApiKey());
      const { text } = await generateText({
        model: gateway(MODEL),
        system:
          "Write a tailored, professional cover letter (3-4 short paragraphs). Match the candidate's actual experience to the role; never invent credentials. Tone: confident, warm, concrete.",
        prompt: `Candidate profile:\n${profileSummary(profile)}\n\nRole: ${data.job_title} at ${data.company}\n\nJob description:\n${data.job_description}`,
      });
      await supabase.from("generated_documents").insert({
        user_id: userId,
        doc_type: "cover_letter",
        content: text,
        metadata: { job_title: data.job_title, company: data.company },
      });
      return { text };
    } catch (err) {
      throw mapGatewayError(err);
    }
  });

/* ---------------- Interview kit ---------------- */

const InterviewSchema = z.object({
  questions: z
    .array(
      z.object({
        question: z.string(),
        category: z.enum(["behavioral", "technical", "situational", "culture"]),
        what_they_assess: z.string(),
        sample_answer: z.string(),
      }),
    )
    .max(8),
  preparation_tips: z.array(z.string()).max(5),
});

export const generateInterviewKit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        job_title: z.string().min(2),
        company: z.string().optional(),
        job_description: z.string().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    const { supabase, userId } = context as any;
    const profile = await loadProfile(supabase, userId);
    await checkAndConsumeQuota(supabase, userId, "interview_kit");
    try {
      const gateway = createLovableAiGatewayProvider(getApiKey());
      const { output: aiOutput } = await generateText({
        model: gateway(MODEL),
        output: Output.object({ schema: InterviewSchema }),
        system:
          "You are an interview coach. Produce 6-8 likely interview questions for the candidate's target role, mixing behavioral, technical, situational, and culture-fit. For each, give a tight sample answer tailored to the candidate's actual profile.",
        prompt: `Role: ${data.job_title} at ${data.company ?? "the company"}\nJD: ${data.job_description ?? "(not provided)"}\n\nCandidate profile:\n${profileSummary(profile)}`,
      });
      const result = aiOutput;
      await supabase.from("interview_sessions").insert({
        user_id: userId,
        questions: result.questions,
        feedback: { preparation_tips: result.preparation_tips },
      });
      return result;
    } catch (err) {
      throw mapGatewayError(err);
    }
  });
