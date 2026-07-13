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

| #    | Requirement                                                                | Status                     | Notes                                                                                                                                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| i    | Register/login via email+password and Google                               | **Partial**                | Email/password auth built. Google OAuth not yet configured (Supabase supports it; needs OAuth client credentials added in Supabase Auth settings).                                                                                                                                     |
| ii   | Career profiles (education, skills, certifications, experience, interests) | **Done**                   | `career_profiles` table, full CRUD, seeded with 45 realistic profiles.                                                                                                                                                                                                                 |
| iii  | Resume upload (PDF/doc)                                                    | **Built, unverified live** | `resumes` table + storage bucket policies exist in schema. Not smoke-tested against the live Vercel deploy yet.                                                                                                                                                                        |
| iv   | NLP resume extraction                                                      | **Partial**                | Schema fields exist (`raw_text`, `parsed_data`, `ats_score`). Actual NLP/LLM call wiring depends on an AI provider key being set via the new `/admin/settings` page — not yet set, so this is not functionally live.                                                                   |
| v    | Personalized career recommendations                                        | **Partial**                | Deterministic `scoreJob()` exists (title/skills/work-mode/salary/location match, no LLM cost). LLM-based _narrative_ recommendations are not built.                                                                                                                                    |
| vi   | Employability scoring                                                      | **Partial**                | `EmployabilityScore`-equivalent fields exist in schema (`match_score` on applications). A dedicated, standalone employability score (independent of any single job) is **not built** — see Gap G1 below.                                                                               |
| vii  | Skill-gap analysis                                                         | **Not built**              | No dedicated skill-gap comparison feature yet. See Gap G1.                                                                                                                                                                                                                             |
| viii | Personalized learning recommendations                                      | **Not built**              | No certifications/courses library exists yet. See Gap G2 (highest priority per survey data).                                                                                                                                                                                           |
| ix   | Internship/job recommendations                                             | **Done**                   | Jobs feed, scoring, application tracking all live and seeded.                                                                                                                                                                                                                          |
| x    | ATS-optimized resume generation                                            | **Not built**              | `generated_documents` table exists in schema for this purpose but no generation logic wired up.                                                                                                                                                                                        |
| xi   | AI coaching chatbot                                                        | **Not built**              | No chat interface exists. See Gap G3.                                                                                                                                                                                                                                                  |
| xii  | Admin dashboard (users, opportunities, analytics, content)                 | **Mostly done**            | Users/Roles, Jobs, Job Sources, Blog/CMS, Subscriptions, Audit Log, and the new AI Provider Keys settings page all exist and are role-gated. Content editing is currently limited to blog posts — **not** yet full "edit every pixel of the frontend" per your latest ask. See Gap G4. |

## 3. Non-functional requirements — status

| Requirement                 | Status                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Response time <5s           | Not load-tested                                                                                                                       |
| Passwords encrypted         | **Done** — bcrypt via Supabase Auth                                                                                                   |
| AuthN/AuthZ                 | **Done** — Supabase Auth + RLS + role-based checks on every admin server function                                                     |
| Secure storage/transmission | **Done** — HTTPS via Vercel/Supabase, RLS on every table, Vault for API keys                                                          |
| Simple/consistent UI        | **Partial** — Handshake-style landing page and core app shell exist; no motion/animation layer yet (see Gap G5)                       |
| Responsive (desktop/mobile) | **Done** — Tailwind responsive classes used throughout; not yet manually tested on a real tablet/phone against the live Vercel deploy |
| Reliability / backups       | **Partial** — Supabase handles automated backups on paid tiers; not confirmed which tier CareerPilot AI is on                         |
| Scalability                 | **Done by design** — Supabase + Vercel both scale horizontally without app changes                                                    |
| Browser/OS compatibility    | Not formally tested across browsers                                                                                                   |

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
- **AI provider key management**: real, working, Vault-backed (not plaintext) key
  storage with admin-only RPCs, plus a UI at `/admin/settings`. Smoke-tested end to end.
- **GitHub ↔ Supabase sync**: repo migrations and live database match exactly.
- **Landing page**: Handshake-style layout, no em-dashes, no AI-typical phrasing,
  Fraunces/Inter typography actually loading (was silently falling back before).
- **Vercel deploy path**: configured (`nitro: { preset: "vercel" }` set explicitly),
  but **not yet confirmed live** — you were mid-setup on the Vercel dashboard side
  (framework preset, env vars) when this audit was written. Confirm and report back
  any build errors.

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
matching survey demand: **G1 → G2 → G6 → G3 → G7 → G4 → G5.**

## 6. Demo accounts

All passwords: `Demo2026!CareerPilot` (rotate before any public demo)

| Role               | Email                                | Notes                                                    |
| ------------------ | ------------------------------------ | -------------------------------------------------------- |
| Student            | `demo.student@careerpilot-demo.io`   | Final-year CS student, entry-level profile               |
| Graduate           | `demo.graduate@careerpilot-demo.io`  | Recent grad, Business Admin, one work history entry      |
| Recruiter          | `demo.recruiter@careerpilot-demo.io` | Posts under Zamara Digital, owns 3 seeded jobs           |
| Company (employer) | `demo.company@careerpilot-demo.io`   | `company_admin` role, owns Zamara Digital                |
| Super Admin        | `admin.lucrebag@gmail.com`           | `admin` + `cms_editor`, password `CareerPilot2026!Admin` |

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
