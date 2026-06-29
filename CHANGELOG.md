# CareerPilot AI — Changelog

All notable changes documented per run. See `docs/runs/` for detailed per-run notes.

## Run 02 — 2026-06-29 — Core AI modules (student side)

- 5-step onboarding wizard (Goals → Skills → Education → Experience → Review) with animated step transitions, tag input, persistence to `career_profiles`, and edit-on-return.
- AI server functions (`src/lib/ai.functions.ts`) using AI SDK + Lovable AI Gateway (`google/gemini-3-flash-preview`), all auth-gated via `requireSupabaseAuth`:
  - `scoreEmployability` — overall score + skills/experience/education/market-fit breakdown, strengths, weaknesses, next actions.
  - `analyzeSkillGap` — required skills (critical/important/nice-to-have), per-skill learning plan with resources + ETA.
  - `optimizeResume` — ATS score, keyword matches/misses, issues, rewritten summary, suggested bullets; persists each run to `resumes`.
  - `recommendCareers` — up to 5 career paths with fit score, rationale and a 90-day plan, plus upskilling & networking moves.
  - `generateCoverLetter` — tailored cover letter from candidate profile + JD; saved to `generated_documents`.
  - `generateInterviewKit` — 6–8 likely questions with category/assessment/sample answer; saved to `interview_sessions`.
  - `getQuotaStatus` — live read of monthly usage.
- Free-tier quota enforced at the server: 2 AI runs / calendar month. Active paid `subscriptions` row bypasses the cap.
- `QuotaBadge` on every AI page; live dashboard tile shows `used / limit`.
- `AiError` component handles quota-exhausted (`upgrade` CTA → `/billing`) and gateway 429/402 messages.
- Routes added: `/employability`, `/skill-gap`, `/resume`, `/recommendations` (tabs: paths / cover / interview), `/jobs` (placeholder), `/profile`, `/billing` (placeholder).
- DB: added `resumes.raw_text / target_role / ats_score / analysis`, `career_profiles.recommendations` (jsonb, default `{}`).
- Deps: `ai`, `@ai-sdk/openai-compatible`.

## Run 01 — 2026-06-29 — Foundation

- Enabled Lovable Cloud (Postgres, Auth, Storage).
- Initial database schema: profiles, user_roles (with `has_role()` security-definer), career_profiles, resumes, companies, jobs, applications, generated_documents, interview_sessions, subscriptions, ai_run_usage, feedback_threads, feedback_messages, notifications, blog_posts, audit_log. RLS + GRANTs on every public table.
- Auto-creation trigger: new auth users get a profile and `student` role.
- Auth: email/password + managed Google OAuth. `/auth` page, `/reset-password` page. HIBP password breach check enabled. Email auto-confirm on (dev convenience).
- Brand & design system: deep navy primary, coral accent, teal highlight; Space Grotesk display + Inter body; dark/light/system theme toggle with persistence.
- Routes: public landing (`/`), `/auth`, `/reset-password`, protected `/dashboard` and `/onboarding` under `_authenticated/`.
- Animated 404 page with motion (drifting compass).
- AppShell with sidebar, theme toggle, help dialog scaffold, and notifications icon.
- Lovable + Supabase clients wired with `onAuthStateChange` cache invalidation in `__root.tsx`.
- Docs: `CHANGELOG.md` + `docs/runs/RUN-01.md`.