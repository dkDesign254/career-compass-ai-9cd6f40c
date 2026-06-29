
# CareerPilot AI — Build Plan

Fresh build on Lovable's TanStack Start stack with Lovable Cloud (Postgres + Auth + Storage) and Lovable AI Gateway (Gemini). Everything you selected is in scope; it will ship across sequenced runs so each run is testable and documented.

## Before Run 1

1. You connect this Lovable project to `dkDesign254/AI-Career-Navigator` via the top-right GitHub button (I can't trigger this).
2. I create `CHANGELOG.md` (summary) + `docs/runs/RUN-XX.md` (detail) on every run.

## Roles
`student` (job seeker), `recruiter`, `company_admin`, `admin`, `cms_editor` — stored in a separate `user_roles` table with a security-definer `has_role()` function. Recruiter/admin/CMS routes gated by role checks.

## Run sequence

### Run 1 — Foundation (this run after approval)
- Enable Lovable Cloud
- Design system: dark/light theme tokens, typography, branded palette (no generic purple gradient)
- Auth: email/password + Google, `/auth`, `/reset-password`
- DB schema + RLS for: `profiles`, `user_roles`, `career_profiles`, `resumes`, `jobs`, `applications`, `generated_documents`, `interview_sessions`, `subscriptions`, `ai_run_usage`, `feedback_threads`, `notifications`, `blog_posts`, `audit_log`
- App shell: sidebar nav, top bar, theme toggle, onboarding wizard skeleton, empty dashboard
- Help/tour system scaffold (driver.js-style) + 404 page with animation
- `CHANGELOG.md` + `docs/runs/RUN-01.md`

### Run 2 — Core 5 modules (student side)
Onboarding wizard (full), employability score, skill gap analysis, resume ATS optimizer (PDF/DOCX upload + parse), career recommendations, cover letter & interview prep — all wired to Lovable AI Gateway. Job tracker (manual). Quota: 2 free AI compatibility runs/month.

### Run 3 — Recruiter portal + feedback loop
Recruiter dashboard, job posting (with 30-application cap on free tier), applicant pipeline, ATS shortlist, one-click personalized regret/proceed with applicant reply thread + in-app + email notifications.

### Run 4 — Job board + scraping
Public job board with filters (remote/hybrid/onsite, contract/PT/FT, location, USAID-partner flag). Scraping via Firecrawl connector (LinkedIn/Indeed/company sites where ToS permits) on a scheduled server route. Kenya-first + remote-international.

### Run 5 — Subscriptions + admin/CMS
Stripe via Lovable's built-in payments. Tiers: Free / Pro (more AI runs, unlimited applications) / Recruiter Pro (>30 apps). Separate `/admin` portal with charts (Recharts), tables, user/job/subscription management, audit log, GA4 hook, blog CMS (cms_editor role), GDPR pages (Privacy, Terms, Cookies, DPA).

### Run 6 — Polish
PostHog session recording/heatmaps, in-app onboarding tour, notification center, performance pass, SEO meta on all public routes, security scan.

## Technical notes

- Stack: TanStack Start v1, React 19, Tailwind v4, shadcn/ui, Lovable Cloud (Supabase under the hood), Lovable AI Gateway (`google/gemini-3-flash-preview`).
- Server boundary: `createServerFn` for app-internal; server routes under `src/routes/api/` for webhooks/scraping cron/Stripe.
- File uploads: Lovable Cloud Storage with signed URLs.
- Resume parsing: `pdfjs-dist` + `mammoth` (DOCX) inside server fns.
- Roles enforced via `has_role()` security-definer function + RLS.
- Quota enforcement: server-side check against `ai_run_usage` before each AI call.
- Docs: `CHANGELOG.md` updated each run + `docs/runs/RUN-XX.md` with what changed, schema diffs, env vars added, manual test checklist.

## What I need from you to start Run 1
1. Confirm GitHub repo is connected (or say "skip GitHub for now").
2. Brand direction: any color/font/feel preferences, or pick one I propose?
3. Approve this plan → I'll execute Run 1.
