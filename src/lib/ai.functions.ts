import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText } from "ai";
import { z } from "zod";
import { getAiModel, reportAiResult, mapAiError, generateStructured } from "./ai-model.server";

const FREE_QUOTA = 2;

const QUOTA_TYPES = new Set([
  "employability",
  "skill_gap",
  "resume_ats",
  "recommendations",
  "cover_letter",
  "interview_kit",
]);

type SupabaseClient = Awaited<ReturnType<typeof import("@/integrations/supabase/client").supabase.auth.getUser>> extends never ? never : any;

function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function checkAndConsumeQuota(
  supabase: any,
  userId: string,
  runType: string,
) {
  if (!QUOTA_TYPES.has(runType)) return;

  // Active paid plan bypasses the free quota.
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status, tier")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (sub && sub.tier && sub.tier !== "free") return;

  const period = monthKey();
  const { count, error: countErr } = await supabase
    .from("ai_run_usage")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("period_month", period);
  if (countErr) throw new Error(countErr.message);
  if ((count ?? 0) >= FREE_QUOTA) {
    throw new Error(
      `You've used your ${FREE_QUOTA} free AI runs this month. Upgrade to continue.`,
    );
  }

  const { error: insErr } = await supabase
    .from("ai_run_usage")
    .insert({ user_id: userId, run_type: runType, period_month: period });
  if (insErr) throw new Error(insErr.message);
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

/* ---------------- Deterministic scoring (computed first, LLM narrates it) ----------------
 * The employability score is NOT invented by the LLM. It's computed here from
 * real signals — profile completeness, skill count, work history, certifications,
 * education, and how the candidate's skills actually overlap with real,
 * currently-open job postings in their target field. The LLM's only job
 * afterward is to explain these already-computed numbers clearly, not decide
 * what they are.
 */
async function computeEmployabilityScore(supabase: any, p: any) {
  const skills: string[] = Array.isArray(p.skills) ? p.skills : [];
  const education: any[] = Array.isArray(p.education) ? p.education : [];
  const workHistory: any[] = Array.isArray(p.work_history) ? p.work_history : [];
  const certifications: any[] = Array.isArray(p.certifications) ? p.certifications : [];

  // Skills score: breadth (up to 10 skills counted) plus real market overlap
  // against currently-open jobs in the same field.
  const { data: relevantJobs } = await supabase
    .from("jobs")
    .select("skills")
    .eq("status", "open")
    .or(`title.ilike.%${(p.target_role ?? "").split(" ")[0] || "x"}%,industry.ilike.%${p.industry ?? "x"}%`)
    .limit(40);
  const marketSkillCounts = new Map<string, number>();
  for (const j of relevantJobs ?? []) {
    for (const s of (j.skills as string[] | null) ?? []) {
      marketSkillCounts.set(s.toLowerCase(), (marketSkillCounts.get(s.toLowerCase()) ?? 0) + 1);
    }
  }
  const marketSkillSet = [...marketSkillCounts.keys()];
  const skillsLower = skills.map((s) => s.toLowerCase());
  const matchedMarketSkills = marketSkillSet.filter((ms) => skillsLower.some((s) => s.includes(ms) || ms.includes(s)));
  const marketOverlapRatio = marketSkillSet.length > 0 ? matchedMarketSkills.length / marketSkillSet.length : 0;
  const breadthScore = Math.min(skills.length / 10, 1) * 100;
  const skillsScore = Math.round(breadthScore * 0.5 + marketOverlapRatio * 100 * 0.5);

  // Experience score: work history entries, weighted by experience_level claimed.
  const levelBaseline: Record<string, number> = { student: 20, entry: 35, mid: 55, senior: 75 };
  const base = levelBaseline[p.experience_level] ?? 30;
  const historyBonus = Math.min(workHistory.length * 12, 40);
  const experienceScore = Math.min(base + historyBonus, 100);

  // Education score: presence + recency-agnostic completeness (has institution + qualification).
  const educationScore = education.length > 0
    ? (education.some((e: any) => (e.institution || e.school) && (e.qualification || e.degree)) ? 85 : 50)
    : 20;

  // Market fit: how many currently-open jobs in this field exist at all, and
  // how many of those the candidate's skills meaningfully overlap with.
  const jobCount = relevantJobs?.length ?? 0;
  const strongMatches = (relevantJobs ?? []).filter((j: any) => {
    const jobSkills = ((j.skills as string[] | null) ?? []).map((s) => s.toLowerCase());
    if (jobSkills.length === 0) return false;
    const overlap = jobSkills.filter((js) => skillsLower.some((s) => s.includes(js) || js.includes(s)));
    return overlap.length / jobSkills.length >= 0.4;
  }).length;
  const marketFitScore = jobCount > 0 ? Math.round(Math.min((strongMatches / jobCount) * 150, 100)) : 40;

  // Certifications act as a small, capped bonus layered onto the overall score,
  // not a separate breakdown bucket (keeps the 4-part breakdown stable).
  const certBonus = Math.min(certifications.length * 3, 10);

  const overall = Math.round(
    skillsScore * 0.3 + experienceScore * 0.3 + educationScore * 0.2 + marketFitScore * 0.2 + certBonus,
  );

  return {
    score: Math.min(overall, 100),
    breakdown: {
      skills: skillsScore,
      experience: experienceScore,
      education: educationScore,
      market_fit: marketFitScore,
    },
    computed_facts: {
      skill_count: skills.length,
      matched_market_skills: matchedMarketSkills,
      market_skills_considered: marketSkillSet.length,
      open_jobs_in_field: jobCount,
      strong_job_matches: strongMatches,
      work_history_entries: workHistory.length,
      certifications_count: certifications.length,
      has_education: education.length > 0,
    },
  };
}



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
      .select("status, tier")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    const isPaid = !!(sub && sub.tier && sub.tier !== "free");
    return {
      used: count ?? 0,
      limit: isPaid ? null : FREE_QUOTA,
      isPaid,
      tier: sub?.tier ?? "free",
    };
  });

/* ---------------- Employability score ---------------- */

const EmployabilitySchema = z.object({
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

    // Compute the actual score first — this is math, not an LLM guess.
    const computed = await computeEmployabilityScore(supabase, profile);

    const { provider, model } = await getAiModel();
    try {
      const narrative = await generateStructured({
        model,
        schema: EmployabilitySchema,
        system:
          "You are an expert career coach. You are given an ALREADY-COMPUTED employability score and its breakdown — do not invent or contradict these numbers. Your job is only to explain them: name concrete strengths and weaknesses evidenced by the candidate's actual profile, and give specific, actionable next steps. Be honest and constructive, not generic.",
        prompt: `Candidate profile:\n${profileSummary(profile)}\n\nComputed score: ${computed.score}/100\nBreakdown: skills ${computed.breakdown.skills}, experience ${computed.breakdown.experience}, education ${computed.breakdown.education}, market fit ${computed.breakdown.market_fit}\n\nSupporting facts behind these numbers: ${JSON.stringify(computed.computed_facts)}`,
      });
      await reportAiResult(provider, true);
      const result = { ...computed, ...narrative };
      await supabase
        .from("career_profiles")
        .update({ recommendations: { ...(profile.recommendations ?? {}), employability: result } })
        .eq("user_id", userId);
      return result;
    } catch (err) {
      await reportAiResult(provider, false, err instanceof Error ? err.message : String(err));
      throw mapAiError(err);
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

    // Ground the analysis in real, currently-open job postings instead of
    // letting the model imagine what a role requires.
    const { data: relevantJobs } = await supabase
      .from("jobs")
      .select("title, skills")
      .eq("status", "open")
      .or(`title.ilike.%${(profile.target_role ?? "").split(" ")[0] || "x"}%,industry.ilike.%${profile.industry ?? "x"}%`)
      .limit(25);
    const skillFrequency = new Map<string, number>();
    for (const j of relevantJobs ?? []) {
      for (const s of (j.skills as string[] | null) ?? []) {
        skillFrequency.set(s, (skillFrequency.get(s) ?? 0) + 1);
      }
    }
    const marketSkills = [...skillFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([skill, count]) => `${skill} (appears in ${count} of ${relevantJobs?.length ?? 0} similar live postings)`);

    const { provider, model } = await getAiModel();
    try {
      const aiOutput = await generateStructured({
        model,
        schema: SkillGapSchema,
        system:
          "You are a senior recruiter and career coach. Identify the skills the candidate must build to land their target role and produce a focused learning plan. Ground your assessment in the real, currently-open job postings provided — don't invent requirements that aren't reflected in either the candidate's profile or the market data given.",
        prompt: `Profile:\n${profileSummary(profile)}\n\nTarget role: ${profile.target_role}.\n\nSkills actually required across ${relevantJobs?.length ?? 0} similar currently-open job postings, ranked by frequency:\n${marketSkills.join("\n") || "(no closely matching live postings found — base this on general industry knowledge and say so)"}`,
      });
      await reportAiResult(provider, true);
      const result = aiOutput;
      await supabase
        .from("career_profiles")
        .update({ recommendations: { ...(profile.recommendations ?? {}), skill_gap: result } })
        .eq("user_id", userId);
      return result;
    } catch (err) {
      await reportAiResult(provider, false, err instanceof Error ? err.message : String(err));
      throw mapAiError(err);
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
    const { provider, model } = await getAiModel();
    try {
      const aiOutput = await generateStructured({
        model,
        schema: ResumeSchema,
        system:
          "You are an ATS expert. Score the resume against the target role, flag issues, and rewrite the summary plus key bullets to be quantified and ATS-friendly.",
        prompt: `Target role: ${data.target_role ?? "general"}\n\nResume:\n${data.resume_text}`,
      });
      await reportAiResult(provider, true);
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
      await reportAiResult(provider, false, err instanceof Error ? err.message : String(err));
      throw mapAiError(err);
    }
  });

/* ---------------- Career recommendations ---------------- */

const RecsSchema = z.object({
  career_paths: z.array(
    z.object({
      title: z.string(),
      fit_score: z.number().min(0).max(100),
      why: z.string(),
      first_90_days: z.array(z.string()).max(5),
    }),
  ).max(5),
  upskilling: z.array(z.string()).max(6),
  networking: z.array(z.string()).max(4),
});

export const recommendCareers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const profile = await loadProfile(supabase, userId);
    await checkAndConsumeQuota(supabase, userId, "recommendations");
    const { provider, model } = await getAiModel();
    try {
      const aiOutput = await generateStructured({
        model,
        schema: RecsSchema,
        system:
          "You are a career strategist. Recommend 3-5 career paths the candidate could pursue, each with a fit score, rationale and an actionable 90-day plan.",
        prompt: `Profile:\n${profileSummary(profile)}`,
      });
      await reportAiResult(provider, true);
      const result = aiOutput;
      await supabase
        .from("career_profiles")
        .update({ recommendations: { ...(profile.recommendations ?? {}), careers: result } })
        .eq("user_id", userId);
      return result;
    } catch (err) {
      await reportAiResult(provider, false, err instanceof Error ? err.message : String(err));
      throw mapAiError(err);
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
    const { provider, model } = await getAiModel();
    try {
      const { text } = await generateText({
        model,
        system:
          "Write a tailored, professional cover letter (3-4 short paragraphs). Match the candidate's actual experience to the role; never invent credentials. Tone: confident, warm, concrete.",
        prompt: `Candidate profile:\n${profileSummary(profile)}\n\nRole: ${data.job_title} at ${data.company}\n\nJob description:\n${data.job_description}`,
      });
      await reportAiResult(provider, true);
      await supabase.from("generated_documents").insert({
        user_id: userId,
        doc_type: "cover_letter",
        content: text,
        metadata: { job_title: data.job_title, company: data.company },
      });
      return { text };
    } catch (err) {
      await reportAiResult(provider, false, err instanceof Error ? err.message : String(err));
      throw mapAiError(err);
    }
  });

/* ---------------- Interview kit ---------------- */

const InterviewSchema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      category: z.enum(["behavioral", "technical", "situational", "culture"]),
      what_they_assess: z.string(),
      sample_answer: z.string(),
    }),
  ).max(8),
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
    const { provider, model } = await getAiModel();
    try {
      const aiOutput = await generateStructured({
        model,
        schema: InterviewSchema,
        system:
          "You are an interview coach. Produce 6-8 likely interview questions for the candidate's target role, mixing behavioral, technical, situational, and culture-fit. For each, give a tight sample answer tailored to the candidate's actual profile.",
        prompt: `Role: ${data.job_title} at ${data.company ?? "the company"}\nJD: ${data.job_description ?? "(not provided)"}\n\nCandidate profile:\n${profileSummary(profile)}`,
      });
      await reportAiResult(provider, true);
      const result = aiOutput;
      await supabase.from("interview_sessions").insert({
        user_id: userId,
        questions: result.questions,
        feedback: { preparation_tips: result.preparation_tips },
      });
      return result;
    } catch (err) {
      await reportAiResult(provider, false, err instanceof Error ? err.message : String(err));
      throw mapAiError(err);
    }
  });