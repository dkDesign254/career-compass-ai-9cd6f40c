# CareerPilot AI — State-of-the-App Audit (baseline @ Run 06)

Baseline snapshot of everything shipped in Runs 01–05, captured before the design reset in Run 06. This file is the reference point for every future run.

## Repository & platform
- Lovable project mirrored to GitHub: `dkDesign254/AI-Career-Navigator` (single source of truth — no forks, no side branches).
- Stack: TanStack Start (SSR) + React 19 + Tailwind v4 + shadcn/ui + Framer Motion. Backend: Lovable Cloud (Supabase Postgres + Auth + Storage). AI: Lovable AI Gateway (`google/gemini-1.5-flash`). Scraping: Firecrawl.

## Database (Supabase)
- Auth-linked `profiles`, `user_roles` (student / recruiter / company_admin / cms_editor / admin), `career_profiles`, `resumes`, `jobs`, `applications`, `application_feedback`, `notifications`, `ai_run_usage`, `subscriptions`, `blog_posts`, `job_sources`, `audit_log`, plus onboarding progress tables.
- RLS everywhere; `has_role()` is `SECURITY INVOKER` and self-reads on `user_roles` are the trust root.
- `jobs` uses `UNIQUE (source, external_id)` for idempotent scraper upserts.
- `pg_cron` triggers `POST /api/public/hooks/scrape-jobs` every 12h (00:00 & 12:00 UTC).
- Storage: private `resumes` bucket with per-user RLS.

## Server APIs (TanStack Start server functions)
- `src/lib/ai-gateway.server.ts` — Lovable AI wrapper with monthly quota (2 free runs) tracked in `ai_run_usage`.
- `src/lib/recruiter.functions.ts` — recruiter onboarding, job CRUD, applicant pipeline, decision notifications.
- `src/lib/jobs.functions.ts` — job search, apply, my applications, my resumes, my roles.
- `src/lib/scrape.server.ts` + `scrape.functions.ts` — Firecrawl scraping, per-source & bulk runs, cron hook.
- `src/lib/admin.functions.ts` — admin-only CRUD for users, roles, jobs, blog, subscriptions, audit log reader.
- `src/lib/resume-parse.ts` — client-side PDF/DOCX/TXT extraction.

## Routes shipped
- Public: `/` (landing), `/auth`.
- Authenticated (student): `/dashboard`, `/onboarding`, `/employability`, `/skill-gap`, `/resume`, `/recommendations`, `/profile`, `/jobs`, `/applications`.
- Recruiter: `/recruiter`, `/recruiter/jobs/*`.
- Admin: `/admin` hub + `/admin/users`, `/admin/jobs`, `/admin/scraping`, `/admin/blog`, `/admin/subscriptions`, `/admin/audit`.

## Design system (pre-Run 06)
- Palette: navy `--brand` + coral `--coral` + teal `--teal`, oklch tokens.
- Fonts: Space Grotesk (display) + Inter (sans).
- Landing: gradient hero, blur orbs, feature grid. **Rejected by user as "AI-intensive".**

## Known gaps as of Run 05 (targets for Runs 06–11)
1. Visual language reads as generic AI product, not editorial/Handshake-grade.
2. Dashboard is a static card grid — no social feed, no journey, no in-context help.
3. Jobs open externally when scraped instead of rendering on-platform with full description + compatibility score + "people to contact".
4. No OAuth import (LinkedIn / GitHub) or profile-URL crossreference (Fuzu, Upwork, Freelancer, Handshake).
5. Admin cannot manage API keys or edit landing/marketing copy from the console (no CMS-of-strings yet).
6. No demo/seed data for admin review of realistic student journeys.
7. No guided walkthrough ("house → cab → highway → terminal → gate → cockpit" journey metaphor).

## Documentation cadence going forward
- Every run creates a fresh `docs/runs/RUN-XX.md` file.
- `CHANGELOG.md` gets a summary entry at the top per run.
- No retroactive edits to prior run docs — only additive follow-up notes if a later run touches the same surface.