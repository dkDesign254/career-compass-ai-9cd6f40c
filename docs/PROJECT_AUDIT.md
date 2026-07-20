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
- **Vercel deploy**: **confirmed live and current as of 2026-07-16.** Important history:
  deployments silently broke after commit `78af833` (a `vercel.json` with a `functions`
  block incompatible with this project's Nitro/Build-Output-API-v3 deployment) and
  stayed broken through 13 consecutive commits, roughly two full sessions of work,
  while the site kept serving the last successful pre-break build. Caught only when
  the user sent a screenshot showing an error message from code that had already been
  deleted. Fixed by deleting `vercel.json`. **Lesson for future verification**: an HTTP
  200 alone doesn't confirm a deployment is current — a stale build can return 200 for
  a route that existed before it went stale. Verify by checking response *content*
  against something known to have changed recently, not just status code.

## 5. Known gaps, prioritized by survey demand (§1) — status recap

Quick reference before reading the detailed entries below: **Done** — G1, G8, G9, G10,
plus two items shipped same-session as requested (subscription/quota bug fix + demo
account upgrades, public job browsing at `/browse`). **Partially done** — G3 (career
recs/ATS/cover letter/interview kit work; no open-ended chat UI), G4 (blog CMS only,
not full-page editing), G5 (some hover/entrance motion added on the landing page; no
broader animation pass). **Not built** — G2, G6, G7, and the full G11–G27 batch logged
in §8.

**G1 — Employability score & skill-gap analysis.** **Corrected: this was already
built, not missing.** `ai.functions.ts` already implemented employability scoring,
skill-gap analysis (now enhanced to ground itself in real, currently-open job postings
instead of letting the model invent role requirements), resume ATS optimization,
career recommendations, cover letter generation, and interview kit generation. The UI
pages (`employability.tsx`, `skill-gap.tsx`) already existed too. The real problem: all
of it called Lovable's proprietary AI gateway (`ai.gateway.lovable.dev`, needs a
Lovable Cloud workspace), meaningless outside Lovable's infrastructure. Rewired all 6
AI call sites to `src/lib/ai-model.server.ts`, which resolves a real key via the same
Vault-backed `get_next_ai_key()` system built for G8, using Gemini's official
OpenAI-compatible endpoint.

**Verification history (three real bugs found via live user testing, all fixed):**
1. Firecrawl (a scraping key, not an LLM) was leaking into the general LLM fallback
   pool — `get_next_ai_key()` sometimes handed a Firecrawl key to a text-generation
   call. Fixed by adding a `category` column (`llm` | `scraping`) and scoping the pool.
2. Gemini's OpenAI-compatible endpoint doesn't actually support the `responseFormat`
   structured-output feature despite Google's docs suggesting otherwise — confirmed via
   a Vercel runtime log warning the user screenshotted directly. Replaced the
   provider-specific structured-output path entirely with `generateStructured()`
   (prompt-based JSON + Zod validation + one self-correcting retry), which doesn't
   depend on any provider-specific feature.
3. Gemini reliably returns numbers as quoted strings (`"85"` instead of `85`) in JSON
   output despite explicit instructions not to. Fixed at the root with
   `coerceNumericStrings()` inside `generateStructured()`, rather than patching each of
   the 7 exposed numeric fields individually.

4. **The actual root cause, found last**: even after fixes 1-3, skill-gap and career
   recommendations still failed in production (`required_skills` came back as an array
   of plain strings instead of objects; `career_paths` came back missing required
   fields with `upskilling`/`networking` as arrays of objects instead of strings) —
   caught via user screenshots showing these specific validation errors. Root cause:
   `generateStructured()` only ever told the model "respond with raw JSON," never the
   actual shape — no field names, no nesting spec. That's fine for flat schemas (which
   is why employability and resume ATS never failed) but unreliable the moment a
   schema has nested objects or arrays-of-objects. Fixed by adding `zod-to-json-schema`
   and embedding the real JSON Schema in the prompt so the model has an unambiguous
   spec instead of a guess. **Verified with a live production test using the exact
   previously-failing schema shape** — correct output, first attempt, no retry needed.

**Status: employability score, skill-gap analysis, and career recommendations are
now genuinely confirmed working** — the JSON-schema-embedding fix (point 4) was tested
live against production with the exact schema shape that had been failing, not
inferred from an earlier partial fix. The earlier "confirmed working" claim in this
file (based on user screenshots that turned out to only cover employability, not
skill-gap or career-recs) was premature and is corrected here. Resume ATS, cover
letter, and interview kit share the same `generateStructured()` path and should
benefit from the same fix, but haven't been individually tested — say so if asked
rather than assuming.

**The standalone-API-route 404 issue noted earlier no longer reproduces.** A fresh
standalone route (`ai-schema-check.ts`) was added, deployed, called successfully
(200, correct response), and removed during this session's testing — the earlier 404s
were very likely just symptoms of the `vercel.json` deployment breakage happening at
the same time, not a real routing bug. Standalone API routes are fine to use.

**G2 — Certifications/courses library with real links.** **Done** — shipped and
tracked under G18 in §5's gap list below (21 real certifications with genuine issuers
and URLs). Leaving this entry rather than deleting it since G2 and G18 refer to the
same feature and future readers may look for either number.

**G3 — AI coaching chatbot with nuance.** Partially addressed as a side effect of the
G1 fix: career recommendations, resume ATS review, cover letter generation, and
interview kit generation are all now wired to a real AI provider (see G1). A dedicated
open-ended chat *interface* (as opposed to these structured, single-purpose AI
features) is still not built.

**G4 — Full CMS control ("super admin can edit every pixel").** Partially built (blog
CMS only). Extending this to logos, icons, social links, and arbitrary page copy needs
a generalized `site_content` key-value table + an admin page to edit it + the frontend
components switched from hardcoded strings/images to reading from that table. This is a
meaningful refactor of the landing page and app shell, not a small addition.

**G5 — Motion/animation layer.** **Partially built.** Framer Motion added to the
landing page trust bar (staggered entrance, hover scale) and category cards
(hover-reveal purpose copy). Not yet extended to the authenticated app (dashboard,
job cards, onboarding) or given a deliberate systemwide motion language.

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

**G8 — Recurring 12-hour scraping cron.** **Built and verified working end to end.**
`scrape.server.ts` now pulls the Firecrawl key from Vault via `/admin/settings`
(you added it) instead of requiring a raw env var. A `pg_cron` job
(`scrape-jobs-every-12h`) hits the live `/api/public/hooks/scrape-jobs` webhook via
`pg_net` every 12 hours. Diagnostic note for the record: running all 5 sources fully
in parallel hung indefinitely on the live Vercel deployment (tested at 90s+ with no
response) — root cause not fully pinned down (no Vercel log access this session, the
MCP connector is still broken), but batching to 2 sources concurrently at a time fixed
it cleanly. Final verified run: We Work Remotely (8), Remote OK (5), Fuzu Kenya (10),
MyJobMag Kenya (20), BrighterMonday Kenya (16) — 172 real jobs now in the database
total, all with genuine source URLs.

**G9 — Country/language selector with geo-detection and Google Translate.** **Built.**
`src/lib/geo.functions.ts` reads Vercel's automatic `x-vercel-ip-country` header (free,
no external geo-IP service or API key needed) to suggest a default country; user can
override via dropdown, persisted in localStorage. Language switcher drives Google's
official Website Translator widget (loaded globally, `notranslate` applied to the
switcher itself so it doesn't translate its own UI). Added to both the public landing
nav and the authenticated app header. Not yet tested against the live Vercel deploy —
the geo header only exists in Vercel's production environment, so it can't be verified
locally; confirm the detected country looks right after this deploys.

**G10 — Recruiter/company dashboard depth.** ~~Not confirmed built~~ **Verified built.**
Checked `recruiter.tsx` (my posted jobs list), `recruiter.applicants.$jobId.tsx`
(per-job applicant list with shortlist/proceed/reject decisions and templated
messages to candidates), `recruiter.new-job.tsx` (post a job). This gap was closed
already; corrected here rather than silently dropped.

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

## Verification protocol (mandatory, learned the hard way this session)

Three separate real bugs shipped and went unnoticed for a combined multi-day span
before being caught, purely because "pushed to GitHub" and "builds locally" were
mistaken for "actually working in production." Rule going forward, no exceptions:

1. **After every push, confirm the deploy actually succeeded** — not just that it was
   triggered. An HTTP 200 on a route is not sufficient proof; a stale build can return
   200 for a route that existed before it went stale (this happened). Check response
   *content* against something known to have just changed, or better, ask the user to
   check the Vercel Deployments tab directly and confirm "Ready," not "Error."
2. **Never claim an AI-dependent feature works without seeing a real run's output** —
   not a schema that compiles, not a mocked response, an actual call that returned
   real data. Server-side testing alone could not catch two of the three bugs this
   session (Firecrawl leaking into the LLM pool, Gemini's responseFormat not actually
   working, numbers arriving as strings) — all three needed a real authenticated
   browser session and, in the end, the user's own Vercel log screenshots to diagnose.
3. **When something is fixed reactively from a user's bug report, ask: does this class
   of bug affect anything else already shipped?** The numeric-string coercion bug was
   caught in one field (fit_score) but grepping found 7 identical exposures across 3
   other features — fixed once at the root instead of waiting for 6 more bug reports.
4. **Treat Vercel dashboard screenshots (Deployments tab status, Logs tab with actual
   runtime errors) as the ground truth over any indirect testing** — they were more
   useful for real diagnosis this session than every other tool combined.

## How to keep this file honest (rule for every future session)

1. Before starting new work, read this file and `docs/CHANGELOG.md`. Do not re-read
   full chat history to reconstruct project state — this file is the reconstruction.
2. After any change that alters schema, security posture, deployed features, or scope,
   append an entry to `docs/CHANGELOG.md` (never edit past entries) **and** update the
   relevant section above so this file always reflects current reality, not history.
3. Every status claim in this file should be something that was actually verified
   (queried, tested, or read from source), not assumed. If something is unverified,
   say so explicitly, as done above.

## 8. Large request batch — 2026-07-14 (staged, not yet built)

A single message requested a large number of distinct features. Two were built
immediately (see Changelog): the subscription/quota bug fix + demo account upgrades,
and public job browsing without login. Everything else below is logged as a gap,
grouped by theme, not yet built. None of this was attempted blind — each needs either
real design decisions, real data curation, or careful UI work that shouldn't be rushed
alongside a dozen other things in the same pass.

**Profile & identity**
- G11: LinkedIn-style full profile page (banner image, photo, structured sections) —
  referenced against the user's real LinkedIn profile as a model. Needs the profile
  schema extended (banner_url doesn't exist yet) and a real page redesign.
- G12: Profile completeness score + AI-generated suggestions to improve it.
- G13: OAuth sign-in — Google, LinkedIn, GitHub. Needs verification that Google OAuth
  is actually configured correctly in Supabase Auth settings (client ID/secret), plus
  new LinkedIn/GitHub OAuth app registration.

**Jobs & applications**
- G14: **Done, verified end to end.** New Job Alerts card on the profile page —
  keyword chips, work-mode filters, on/off toggle. Wired into the real scraper
  notification logic (shared with G22): matches new jobs against both target_role
  and explicit keyword alerts, deduped to one notification per user. Verified by
  setting a real preference, triggering the scraper, and confirming the correct
  notification landed with the right wording — then cleaned up the test data.
- G15: **Done.** "Your resumes" history list on the resume page — title, date, target
  role, score for every past ATS run; clicking one loads its saved analysis. Also
  found and fixed a real bug in the process: `resumes.title` is `NOT NULL` but the
  insert never set it, meaning the ATS feature would have hard-failed for any real
  (non-seeded) user's first upload.
- G16: **Partially done.** Job titles in the applications list now link to the job
  detail page. Not done: distinguishing/linking applications made outside the app
  (external source sites) vs. inside it, and the visual step-by-step status
  "map"/timeline the user described — currently just a status badge.
- G17: **Done.** Real applications analytics summary (total, active, response rate,
  average days-to-response) — computed from actual application data, not placeholders.

**Skill gap & recommendations**
- G18: Skill-gap page redesign — a general, always-visible library of real
  certifications/diplomas/degrees (not just a blank page waiting for an AI run), plus
  the existing personalized analysis alongside it. Needs real, verifiable course/cert
  data curated the same way the real job data was — can't be fabricated.
- G19: **Done.** New `career_paths` table — 14 real, well-established career fields
  with genuine entry-level titles, core skills, and typical progression, shown as an
  always-visible expandable card grid on the recommendations page, above the
  AI-gated "Personalized paths" tab.

**Platform / navigation**
- G20: **Done.** Full ISO country list (195 countries) with search filtering, expanded
  to 35 languages. Not yet done: tying the selected country to auto-suggesting that
  country's own language(s) — currently the two selectors are independent.
- G21: Help section redesign — contextual hover help per sidebar icon instead of a
  static popup, plus a Scribe-style guided step-by-step walkthrough of the dashboard.
- G22: **Done, verified end to end.** The 12-hour scraper now generates real
  notifications after each run — matches genuinely new jobs (distinguished from
  re-scraped existing rows via `created_at`) against each user's `target_role`,
  notifies only users with an actual match. Bell icon shows a live unread count.
  Test-triggered the scraper directly and confirmed: 5 new jobs detected, 9 real
  notifications created and correctly worded, cleaned up after confirming.
- G23: **Done.** Dark/light mode toggle added to the public landing page nav.

**Design**
- G24: Another landing page design pass — explicitly compared against joinhandshake.com
  and fuzu.com again, current state judged not close enough. Needs real, non-AI-looking
  imagery (stock photography or original illustration, not the current generated set).

**CMS & platform-wide**
- G25: WordPress-style CMS — super admin editing of all pages/posts/site content, not
  just the blog. This is the same ask as the earlier-logged G4, restated with a
  specific comparison point (WordPress).
- G26: Social/LinkedIn-style features — any user able to post, a feed, general social
  platform mechanics layered onto the career platform.

**Process**
- G27: Periodically review the Google Sheet questionnaire responses for new feedback
  and make adjustments accordingly, notifying the user when this happens rather than
  doing it silently.

Recommended next: given survey data already reviewed ranks concrete career-outcome
features (skill gap, recommendations, resume tools) above social/platform features,
suggest tackling G18/G19 (skill-gap and recommendations pages becoming genuinely useful
without requiring an AI run first) next, since they're concrete, don't require new
third-party OAuth app registrations, and build directly on what's already shipped.
