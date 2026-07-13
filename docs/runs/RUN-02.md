# Run 02 — Core AI Modules (Student Side)

**Date:** 2026-06-29
**Scope:** Onboarding wizard + 5 AI modules + quota + supporting routes.

## What shipped

### Onboarding (`/onboarding`)

5-step wizard with framer-motion transitions; saves to `public.career_profiles` via upsert keyed on `user_id`. Pre-populates from existing row on return.

| Step       | Fields                                                    |
| ---------- | --------------------------------------------------------- |
| Goals      | target_role, industry, experience_level, target_locations |
| Skills     | skills[] (tag input)                                      |
| Education  | institution, qualification, year                          |
| Experience | work_history (free text), career_goals                    |
| Review     | read-only summary, Save button                            |

### AI server functions (`src/lib/ai.functions.ts`)

All `createServerFn` + `requireSupabaseAuth` + `mapGatewayError` + monthly `ai_run_usage` insert. Default model `google/gemini-3-flash-preview` via `createLovableAiGatewayProvider`. Structured output via AI SDK `Output.object` + Zod (lean schemas to stay within Gemini constrained-decoding limits).

| Server fn              | Persists to                                         | Quota type        |
| ---------------------- | --------------------------------------------------- | ----------------- |
| `scoreEmployability`   | `career_profiles.recommendations.employability`     | `employability`   |
| `analyzeSkillGap`      | `career_profiles.recommendations.skill_gap`         | `skill_gap`       |
| `optimizeResume`       | new `resumes` row (raw_text, ats_score, analysis)   | `resume_ats`      |
| `recommendCareers`     | `career_profiles.recommendations.careers`           | `recommendations` |
| `generateCoverLetter`  | `generated_documents` row (doc_type=`cover_letter`) | `cover_letter`    |
| `generateInterviewKit` | `interview_sessions` row                            | `interview_kit`   |
| `getQuotaStatus`       | — (read)                                            | —                 |

### Quota enforcement

- Free tier: **2 AI runs / calendar month** (server-side count of `ai_run_usage` rows scoped to `user_id` and `period_month = first-of-month`).
- Bypass: any `subscriptions` row with `status='active'` and `plan ≠ 'free'`.
- Out-of-quota throws a human-readable error; UI shows the `AiError` quota state with an Upgrade CTA → `/billing`.
- Gateway 429 → "AI is busy, try again". Gateway 402 → "AI credits exhausted on this workspace".

### Routes added

- `/_authenticated/employability` — ring score, breakdown bars, strengths/weaknesses/next actions.
- `/_authenticated/skill-gap` — required skills list with importance badges + learning plan.
- `/_authenticated/resume` — textarea paste + target role, ATS score, keyword chips, issues, rewritten summary, bullet suggestions.
- `/_authenticated/recommendations` — tabs: paths · cover letter · interview kit.
- `/_authenticated/jobs` — placeholder pointing to Run 4.
- `/_authenticated/profile` — edit full_name; link to onboarding.
- `/_authenticated/billing` — placeholder pointing to Run 5.

### Components

- `quota-badge.tsx` — live `used / limit` chip on every AI page header.
- `ai-result-card.tsx` — `ScoreRing`, `MetricRow`, `ChipList`, `SectionCard` primitives.
- `ai-error.tsx` — branded error block with quota/upgrade handling.

### Dashboard

- "AI runs this month" tile is now live (was `0 / 2` stub).
- Footer copy updated.

## DB changes

```
ALTER TABLE public.resumes ADD COLUMN raw_text TEXT;
ALTER TABLE public.resumes ADD COLUMN target_role TEXT;
ALTER TABLE public.resumes ADD COLUMN ats_score INTEGER;
ALTER TABLE public.resumes ADD COLUMN analysis JSONB;
ALTER TABLE public.career_profiles ADD COLUMN recommendations JSONB DEFAULT '{}';
```

No new tables — no new RLS policies needed; existing per-user policies cover the new columns.

## Dependencies added

- `ai` (Vercel AI SDK v7)
- `@ai-sdk/openai-compatible` (gateway adapter)

## Manual test checklist

- [ ] Sign in → `/onboarding` → complete 5 steps → land on `/dashboard`.
- [ ] `/dashboard` shows quota tile `0 / 2`.
- [ ] `/employability` → Run analysis → score + breakdown render; quota becomes `1 / 2`.
- [ ] `/skill-gap` → Run analysis → quota becomes `2 / 2`.
- [ ] 3rd AI run on any module shows the quota-exceeded `AiError` with Upgrade CTA.
- [ ] `/resume` → paste 200+ chars → ATS report renders.
- [ ] `/recommendations` → all 3 tabs return content when called.
- [ ] Sign out → no AI module routes are reachable.

## Known gaps (deferred)

- Resume **file upload** (PDF/DOCX parse) — currently text paste only. Run 3.
- Recruiter portal + applications feedback — Run 3.
- Job scraping & matching — Run 4.
- Stripe subscriptions + plan picker — Run 5.
- Admin / CMS — Run 5.
- SEO meta per route, tour overlay, heatmaps — Run 6.

## Linter notes

No new warnings introduced. Pre-existing `0029_authenticated_security_definer_function_executable` on `public.has_role` remains accepted (canonical Supabase RLS-helper pattern).
