# CareerPilot AI — Changelog

All notable changes documented per run. See `docs/runs/` for detailed per-run notes.

## Run 09 — Scraper expansion + admin URL preview

- Disabled `LinkedIn Jobs` source (LinkedIn blocks scrapers); the previous red error on `/admin/scraping` is gone.
- Added curated sources: Remotive, Remote Rocketship, Wellfound, Remote Woman, AI Job Board, FlexJobs, JS Remotely, Toptal, Corporate Staffing Kenya, Safaricom Careers.
- New admin server fn `testScrapeUrl` and a **Preview URL** button in the "Add source" card — runs Firecrawl on any URL and shows the first 10 extracted jobs (or the error) without writing to the DB.
- Seeded 24 realistic demo jobs across the new sources for review.

## Run 06 — Design reset: editorial landing (Handshake × LinkedIn)

- Baseline audit captured in `docs/AUDIT.md` — snapshot of every table, server fn, route and design token shipped through Run 05, plus the seven gaps queued for Runs 07–11.
- New palette: ivory `#FBFAF7` canvas, ink foreground, LinkedIn blue `#0A66C2` primary, Handshake orange `#F26B3A` accent, sage secondary; matching dark mode. `--radius` tightened to `0.625rem`.
- Typography: display face swapped from Space Grotesk to **Fraunces** (serif, 400/500/600); Inter retained for body.
- Landing page (`/`) rewritten from scratch — removed gradient hero, blur orbs, `bg-grid`, motion-heavy feature cards and the gradient CTA panel. New structure: minimal nav, editorial serif hero with photographic image, live jobs strip, three-pillar section, journey teaser, closing CTA.
- `src/lib/public-jobs.functions.ts` — new read-only public server fn returning the six most recent open jobs via `supabaseAdmin` (no RLS relaxation needed). Consumed on the landing page with React Query.
- `src/assets/hero-landing.jpg` — editorial photograph asset for the hero.
- Explicitly deferred (in this order, as agreed): Run 07 social-feed dashboard + journey walkthrough · Run 08 on-platform job rendering with compatibility scores and "people to contact" · Run 09 scraper expansion + seed data · Run 10 LinkedIn/GitHub OAuth + profile-URL imports · Run 11 API-key manager + CMS-of-strings.

## Run 05 — Full admin CRUD, audit log, 12h auto-scrape

- Scraper fix: replaced partial unique index with a real `UNIQUE (source, external_id)` constraint so upserts stop erroring on `ON CONFLICT`.
- Automation: `pg_cron` job runs `POST /api/public/hooks/scrape-jobs` every 12 hours (00:00 & 12:00 UTC) using the Supabase publishable key.
- Admin server API (`src/lib/admin.functions.ts`, admin-only): user search + role grant/revoke, job list/edit/delete (title, status, cap), blog CRUD (`body_md`, `cover_image_url`, publish flag), subscription grant/revoke (`tier` + `current_period_end`), audit log reader, scrape schedule inspector.
- Scrape server API additions: `updateJobSource`, `deleteJobSource` (admin-only).
- Audit trail: every admin write is recorded via `log_admin_action` into `audit_log` (actor, action, entity, metadata) and surfaced in `/admin/audit`.
- Admin UI (all under `/admin`, sidebar tile "Admin console" gated on `admin` role):
  - `/admin` hub tiles for every management area.
  - `/admin/users` — search users, add / remove any role (student, recruiter, company_admin, cms_editor, admin).
  - `/admin/jobs` — inline edit title / status / cap, delete any job (scraped or native).
  - `/admin/scraping` — inline edit name / URL / region, delete source, per-source scrape, "Run all now", 12h schedule notice.
  - `/admin/blog` — create / publish / delete Markdown posts with cover URL and excerpt.
  - `/admin/subscriptions` — grant Pro/Team for N months or revoke back to free.
  - `/admin/audit` — chronological admin action feed with metadata.
- Fix: recruiter decision notifications now insert `type` (schema column), unblocking the shortlist / proceed / regret flow that Run 03 introduced.

## Run 04 — Job scraping (Kenya + international)

- Fix: `ai_run_usage` RLS now allows self-inserts (`auth.uid() = user_id`), unblocking every AI module (Employability, Skill Gap, Resume/ATS, Recommendations, Cover Letters, Interview Kit).
- DB: `jobs.is_scraped / source_url / external_id / scraped_at`; partial unique index `(source, external_id)` for idempotent re-runs; `job_sources` table (name, base_url, region, enabled, last_scraped_at, last_status, last_error) with RLS — admins manage, authenticated users read.
- Firecrawl connector wired via `FIRECRAWL_API_KEY`. `src/lib/scrape.server.ts` extracts structured `jobs[]` (title/company/location/url/description/employment_type/work_mode) per source URL using Firecrawl JSON mode.
- Server functions (`src/lib/scrape.functions.ts`, admin-gated via `has_role`): `listJobSources`, `toggleJobSource`, `addJobSource`, `runJobScrape` (all sources or one). Normalizes work_mode/employment_type and upserts on `(source, external_id)`.
- Cron endpoint: `POST /api/public/hooks/scrape-jobs` — authenticated with Supabase publishable key in the `apikey` header for scheduled runs.
- Seeded sources: BrighterMonday, MyJobMag, Fuzu (Kenya); Remote OK, We Work Remotely (Global).
- UI: `/admin/scraping` — add source, per-source enable toggle, per-source Scrape button, "Run all now"; shows last status / error. `/jobs` — scraped listings are badged with the source and open externally via "View on {source}"; internal jobs keep the Apply dialog. Sidebar exposes **Job Sources** only for `admin`.

## Run 03 — Recruiter portal, applications, file uploads

- Storage: private `resumes` bucket with per-user RLS (read/write/update/delete scoped to `auth.uid()`).
- DB: `resumes.file_path / file_name / file_size`; auto `updated_at` triggers on `jobs` and `applications`; recruiter→applicant notification RLS.
- Server functions:
  - `src/lib/recruiter.functions.ts` — `becomeRecruiter`, `listMyJobs`, `createJob` (free-tier 30-application cap), `listApplicants` (joins resume ATS + applicant profile), `decideApplication` (writes status + feedback thread + notification).
  - `src/lib/jobs.functions.ts` — `listOpenJobs` (search + work_mode), `applyToJob` (validates open + cap), `listMyApplications`, `listMyResumes`, `getMyRoles`.
  - `src/lib/resume-parse.ts` — client-side PDF / DOCX / TXT extraction using `pdfjs-dist` (worker via `?url`) and `mammoth`, dynamically imported.
- Routes:
  - `/recruiter` — pipeline overview; enable-recruiter affordance falls back to `/profile`.
  - `/recruiter/new-job` — full job posting form.
  - `/recruiter/applicants/:jobId` — applicant pipeline with ATS badge, shortlist / proceed / regret actions and editable preset messages that auto-open a feedback thread.
  - `/jobs` — real job board with search, work-mode filter, resume picker, and cover-note dialog.
  - `/applications` — student tracker with live feedback threads.
  - `/profile` — roles panel; one-click "Enable recruiter" upgrades the user role and unlocks the recruiter sidebar entry.
- UI:
  - `FeedbackThread` component (real-time-ready Q-invalidated messaging).
  - Sidebar shows **My Applications** for everyone and **Recruiter** when role grants it.
  - Resume page now supports drag-in PDF/DOCX uploads; extracted text auto-populates and the storage path is linked to the saved `resumes` row.
- Quota / role checks unchanged; recruiter actions gated by `recruiter | company_admin | admin`.

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