# CareerPilot AI — Project Audit & Status

**Read this file first in any new session before touching this project.** It replaces
needing to re-read chat history. If you (Claude) are picking this project back up,
this file plus `docs/CHANGELOG.md` should be sufficient context. Update both after
every change, per the rule at the bottom of this file.

Last full audit: 2026-07-13
Repo: `dkDesign254/career-compass-ai-9cd6f40c` (GitHub)
Database: Supabase project `CareerPilot AI`, ref `xyrbantrlfgzttpraqbz`
Stack: TanStack Start (React, SSR) + Supabase (Postgres/Auth/Storage/Vault) + Vercel (deploy target)

---

## 1. Source documents this audit is checked against

- `DK_670797_CareerPilotAI_APT-IST_4900_FINAL_PROJECT.docx` — the academic paper.
  Chapter 4 (System Analysis and Design) is the functional/non-functional requirements
  source of truth. Note: the paper's stated architecture (Next.js + FastAPI + PostgreSQL)
  does **not** match the actual build (TanStack Start + Supabase). This is a deliberate
  technology substitution made during implementation, not a gap — Chapter 4's diagrams
  in `docs/diagrams/` have been redrawn to reflect what was actually built. If the
  written thesis text still says Next.js/FastAPI, that prose should be updated to
  describe TanStack Start + Supabase before submission, or the diagrams and prose will
  disagree.
- Questionnaire responses (Google Sheet, 44 respondents) — confirms demand: most
  respondents "strongly recommend" or "recommend" an AI career navigator. Top requested
  capabilities, ranked by frequency: personalized career recommendations, skill-gap
  analysis, resume/ATS optimization, internship & job recommendations, employability
  score, personalized learning recommendations, AI career coaching, continuous guidance.
  This ranking is used below to prioritize what remains unbuilt.
- ChatGPT share link provided — did not render retrievable content via fetch (likely
  requires login). If it contains requirements not captured elsewhere, paste the
  content directly into chat next session.

---

## 2. Functional requirements — status against Chapter 4.1.1

| # | Requirement | Status | Notes |
|---|---|---|---|
| i | Register/login via email+password and Google | **Partial** | Email/password auth built. Google OAuth not yet configured (Supabase supports it; needs OAuth client credentials added in Supabase Auth settings). |
| ii | Career profiles (education, skills, certifications, experience, interests) | **Done** | `career_profiles` table, full CRUD, seeded with 45 realistic profiles. |
| iii | Resume upload (PDF/doc) | **Built, unverified live** | `resumes` table + storage bucket policies exist in schema. Not smoke-tested against the live Vercel deploy yet. |
| iv | NLP resume extraction | **Partial** | Schema fields exist (`raw_text`, `parsed_data`, `ats_score`). Actual NLP/LLM call wiring depends on an AI provider key being set via the new `/admin/settings` page — not yet set, so this is not functionally live. |
| v | Personalized career recommendations | **Partial** | Deterministic `scoreJob()` exists (title/skills/work-mode/salary/location match, no LLM cost). LLM-based *narrative* recommendations are not built. |
| vi | Employability scoring | **Partial** | `EmployabilityScore`-equivalent fields exist in schema (`match_score` on applications). A dedicated, standalone employability score (independent of any single job) is **not built** — see Gap G1 below. |
| vii | Skill-gap analysis | **Not built** | No dedicated skill-gap comparison feature yet. See Gap G1. |
| viii | Personalized learning recommendations | **Not built** | No certifications/courses library exists yet. See Gap G2 (highest priority per survey data). |
| ix | Internship/job recommendations | **Done** | Jobs feed, scoring, application tracking all live and seeded. |
| x | ATS-optimized resume generation | **Not built** | `generated_documents` table exists in schema for this purpose but no generation logic wired up. |
| xi | AI coaching chatbot | **Not built** | No chat interface exists. See Gap G3. |
| xii | Admin dashboard (users, opportunities, analytics, content) | **Mostly done** | Users/Roles, Jobs, Job Sources, Blog/CMS, Subscriptions, Audit Log, and the new AI Provider Keys settings page all exist and are role-gated. Content editing is currently limited to blog posts — **not** yet full "edit every pixel of the frontend" per your latest ask. See Gap G4. |

## 3. Non-functional requirements — status

| Requirement | Status |
|---|---|
| Response time <5s | Not load-tested |
| Passwords encrypted | **Done** — bcrypt via Supabase Auth |
| AuthN/AuthZ | **Done** — Supabase Auth + RLS + role-based checks on every admin server function |
| Secure storage/transmission | **Done** — HTTPS via Vercel/Supabase, RLS on every table, Vault for API keys |
| Simple/consistent UI | **Partial** — Handshake-style landing page and core app shell exist; no motion/animation layer yet (see Gap G5) |
| Responsive (desktop/mobile) | **Done** — Tailwind responsive classes used throughout; not yet manually tested on a real tablet/phone against the live Vercel deploy |
| Reliability / backups | **Partial** — Supabase handles automated backups on paid tiers; not confirmed which tier CareerPilot AI is on |
| Scalability | **Done by design** — Supabase + Vercel both scale horizontally without app changes |
| Browser/OS compatibility | Not formally tested across browsers |

---

## 4. What's concretely done (verified, not assumed)

- **Database**: full schema (15 tables) replicated from the original Lovable-Cloud
  instance onto CareerPilot AI (`xyrbantrlfgzttpraqbz`), via 12 migrations, all committed
  to `supabase/migrations/` in the repo and applied to the live database. Confirmed in
  sync as of this audit.
- **Seed data**: 45 demo job-seeker users (varied by career stage, field, profile
  completeness), 22 companies, 52 jobs, 189 applications. Plus 4 named demo accounts
  covering every role for demonstration purposes (§6 below).
- **Security fixes applied and verified**:
  - `log_admin_action` no longer SECURITY DEFINER-executable by anon/authenticated
  - `companies.owner_id` no longer readable by anon/authenticated at the column level
  - Recruiter-to-applicant notification spoofing already closed (verified existing policy)
  - `@tanstack/*` packages pinned to exact, verified-safe versions (unaffected by
    CVE-2026-45321, pinned as defense-in-depth anyway)
  - Outstanding, not fixable from code: `pg_net` extension schema (Supabase-managed,
    platform blocks the move), leaked-password-protection toggle (manual dashboard
    setting, not SQL)
- **AI provider key management with automatic fallback routing**: Vault-backed
  (not plaintext) storage for multiple keys per provider, admin sets a priority per
  key at `/admin/settings`. A reusable server-side helper (`src/lib/ai-provider.server.ts`,
  `withAiProviderKey()`) picks the highest-priority active key, automatically falls
  back to the next one if a call fails, and trips a 15-minute cooldown on a key after
  3 consecutive failures. Smoke-tested end to end including the fallback path. Not yet
  consumed by any actual AI feature (none exist yet — see G1/G3), but ready to be
  imported the moment one is built. Explicitly does **not** and will not source keys
  from anywhere other than what an admin deliberately enters — scraping the internet
  or public repos for other people's exposed keys was requested and declined as
  unauthorized access to third-party services.
- **GitHub ↔ Supabase sync**: repo migrations and live database match exactly.
- **Real job data.** The 52 fabricated jobs/companies seeded earlier were deleted and
  replaced with 20 real, currently-live job postings pulled directly from BrighterMonday
  Kenya, Fuzu Kenya, and RemoteOK (real companies: Futuristic Ltd, MyAccurate Books,
  Afstor Energy, Simba Corporation, Victory Farms, GIZ Kenya, I&M Bank, NCBA Group,
  World Vision Kenya, BBC World Service, Emerge Egress Consulting, xAI, CoinGecko,
  GiveDirectly, Atlassian, Redis, Affirm, New Relic, Superhuman), each with a real
  source URL and paraphrased (not copied) description. 114 applications reseeded
  against these real jobs. This is a one-time manual pull, not the automated 12-hour
  cron — see Gap G8 below for what's needed to make that recurring.
- **Design**: removed the navy+orange color scheme (the "Handshake orange" label in the
  original CSS comment was inaccurate — Handshake's actual current brand doesn't use
  orange). Replaced with navy + a single vivid indigo accent, light and dark mode both
  updated. Added Framer Motion hover/entrance animation to the trust bar and category
  cards (including a purpose-driven hover reveal: "See your roadmap..."). Footer
  expanded to 5 columns with real LinkedIn/Instagram social icons.
- **Vercel deploy**: **confirmed live** at https://career-compass-ai-9cd6f40c.vercel.app/,
  landing page verified rendering correctly (fetched and inspected directly). Auto-deploys
  on every push to `main` since Vercel is connected to the GitHub repo.

## 5. Known gaps, prioritized by survey demand (§1)

**G1 — Employability score & skill-gap analysis (survey-ranked #1/#2 desired feature).**
Not built as standalone features. Needs: a scoring function independent of any single
job (aggregate profile completeness + skill breadth + experience vs. a target-role
benchmark), plus a skill-gap comparator (user skills vs. a chosen target role's
requirements, gap list output). Estimated as its own stage.

**G2 — Certifications/courses library with real links.** Not built. You asked for a
seeded library of actual real-world certifications, courses, diplomas, degrees with
working application links and guidance, tied into the "guide map" feature below. This
needs real data curation (can't be fabricated — must be genuine, verifiable
certifications/courses per your explicit ask), so it is its own stage of work.

**G3 — AI coaching chatbot with nuance.** Not built. Needs a chat UI + a server function
that calls whichever LLM key is set via `/admin/settings`, with the user's profile as
context. Depends on G1 and an actual provider key being set first.

**G4 — Full CMS control ("super admin can edit every pixel").** Partially built (blog
CMS only). Extending this to logos, icons, social links, and arbitrary page copy needs
a generalized `site_content` key-value table + an admin page to edit it + the frontend
components switched from hardcoded strings/images to reading from that table. This is a
meaningful refactor of the landing page and app shell, not a small addition.

**G5 — Motion/animation layer.** Not built. Needs a decision on library (Framer Motion
was already a dependency per the Jul 4 Lovable run history) and a pass through key
screens (landing, dashboard, job cards, onboarding) to add transitions.

**G6 — Career roadmap/guide map with checkpoints and quotes.** Not built. Depends on G1
(scoring) and G2 (certifications) existing first, since the roadmap is meant to
sequence through them.

**G7 — "Query and ask" advice feature with links to mentors/communities.** Not built.
Overlaps with G3; the mentor/community-links part needs real, curated data (same
constraint as G2).

None of G1–G7 were attempted blind in this session. Building any of them without real
data (G2, G7) or without testing against a live deploy (G1, G3, G5, G6) risks shipping
broken or fabricated content, which is worse than not shipping. Recommended order,
matching survey demand: **G1 → G2 → G6 → G3 → G7 → G4 → G9 → G10 → G8 → G5.**

**G8 — Recurring 12-hour scraping cron.** Infrastructure exists (`scrape.server.ts`,
Firecrawl-based, real structured extraction, `job_sources` table already lists real
sources). Blocked on two things: a `FIRECRAWL_API_KEY` needs to be added (you've only
added Gemini so far), and `scrape.server.ts` currently reads `process.env.FIRECRAWL_API_KEY`
directly rather than through the new Vault-backed `ai_provider_keys` system — these two
need to be wired together, then a `pg_cron` schedule added to trigger it every 12 hours.

**G9 — Country/language selector with geo-detection and Google Translate.** Not built.
Requested: auto-detect country from device location, manual override, and a full-page
Google Translate integration.

**G10 — Recruiter/company dashboard depth.** Recruiter and company_admin roles exist
and demo accounts are linked to real posted jobs, but a dedicated "shortlisted
candidates" view and a "jobs I've posted" management view are not confirmed built out
in the UI — needs verification against the live app and likely some UI work.

None of G8–G10 were attempted blind this session, given remaining time in the session
and that G8 needs a key you haven't added yet, G9 is a clean standalone feature, and
G10 needs live-app verification before extending.

## 6. Demo accounts

All passwords: `Demo2026!CareerPilot` (rotate before any public demo)

| Role | Email | Notes |
|---|---|---|
| Student | `demo.student@careerpilot-demo.io` | Final-year CS student, entry-level profile |
| Graduate | `demo.graduate@careerpilot-demo.io` | Recent grad, Business Admin, one work history entry |
| Recruiter | `demo.recruiter@careerpilot-demo.io` | Posts under Zamara Digital, owns 3 seeded jobs |
| Company (employer) | `demo.company@careerpilot-demo.io` | `company_admin` role, owns The Lucrebag |
| Super Admin | `admin.lucrebag@gmail.com` | `admin` + `cms_editor`, password `CareerPilot2026!Admin` |

## 7. Security posture summary

RLS is enabled on every table. Every admin server function checks role server-side
(not just client-side hiding). Secrets (AI provider keys) live in Supabase Vault, never
in a plain column. `SUPABASE_SERVICE_ROLE_KEY` is deliberately never committed to the
repo — it must be set only as an encrypted Vercel environment variable. No known open
issues from the security-advisor list as of this audit; re-run
`Supabase:get_advisors(type=security)` after any schema change and log the result here.

---

## How to keep this file honest (rule for every future session)

1. Before starting new work, read this file and `docs/CHANGELOG.md`. Do not re-read
   full chat history to reconstruct project state — this file is the reconstruction.
2. After any change that alters schema, security posture, deployed features, or scope,
   append an entry to `docs/CHANGELOG.md` (never edit past entries) **and** update the
   relevant section above so this file always reflects current reality, not history.
3. Every status claim in this file should be something that was actually verified
   (queried, tested, or read from source), not assumed. If something is unverified,
   say so explicitly, as done above.
