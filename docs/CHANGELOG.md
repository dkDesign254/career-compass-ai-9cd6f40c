# CareerPilot AI — Changelog

Append-only. Never edit past entries — if something was wrong, add a new entry
correcting it. Each entry should be self-contained enough to understand without
reading chat history.

---

## 2026-07-13 — Full audit, Chapter 4 diagrams, demo accounts

**Context:** Full site audit requested against the academic paper, the Google Sheet
questionnaire (44 responses), and prior chat history. Created the persistent
`docs/PROJECT_AUDIT.md` so future sessions don't need to re-read chat.

**Changes:**
- Created `docs/PROJECT_AUDIT.md` (comprehensive status document) and this changelog.
- Redrew all 10 Chapter 4 diagrams (architecture, use case, flowchart, class, DFD
  context/level1/level2, ERD, admin sequence, user sequence) as Mermaid source files
  in `docs/diagrams/*.mmd`, updated to reflect the actual built system (TanStack Start
  + Supabase, not the paper's original Next.js + FastAPI description). Rendered each to
  a transparent-background PNG at 3x scale in the same folder.
- Created 4 demo accounts covering student, graduate, recruiter, and company/employer
  roles (see PROJECT_AUDIT.md §6), with realistic linked profile/company/job data so
  each role has something to demo immediately after login.
- Verified GitHub repo and Supabase database are in sync (12 migrations, all applied).
- Verified security advisor list is clean of previously-flagged issues.

**Explicitly not done this session** (see PROJECT_AUDIT.md §5 for full gap list):
employability score / skill-gap analysis, certifications library, AI coaching chatbot,
full CMS content editability beyond blog, motion/animation layer, career roadmap
feature, mentor/community advice links. These were not attempted blind — several
depend on real, curated data (certifications, mentor links) that cannot be fabricated,
and others depend on a live, tested Vercel deployment that was still being configured
on your end as of this entry.

---

## 2026-07-13 (later same day) — AI key fallback routing, Vercel confirmed live

**Context:** Vercel deploy confirmed live and connected to GitHub. Demo credentials
were in the audit doc but not surfaced clearly in chat, given directly. Requested:
a system to auto-scrape the internet/GitHub for other people's exposed API keys and
use them automatically.

**Declined:** the key-scraping request. Explained why (unauthorized access to
third-party services, illegal under CFAA and equivalents, violates every provider's
ToS, personal liability risk). Did not build any part of it, under any framing.

**Built instead (the legitimate version):** multi-key priority-based fallback routing
for the AI provider keys you deliberately add yourself.
- Migration `20260713000000_ai_provider_key_fallback_routing.sql`: added `priority`,
  `consecutive_failures`, `last_used_at`, `last_success_at`, `last_error`,
  `cooldown_until` to `ai_provider_keys`. New RPCs: `set_ai_provider_priority` (admin),
  `get_next_ai_key()` (service_role only — returns decrypted key, never exposed to
  authenticated/anon), `report_ai_key_result()` (service_role only, updates health/
  circuit-breaker state). `set_ai_provider_key` extended to accept a priority.
- Smoke-tested the full fallback path directly in SQL: set two fake keys at different
  priorities, confirmed the higher-priority one is picked first, confirmed 3
  consecutive failures triggers cooldown and the router falls back to the next key.
  Test rows cleaned up after.
- `src/lib/ai-provider.server.ts`: reusable `withAiProviderKey()` helper for any
  future server-side AI feature to import — handles picking a key, retrying against
  a fallback on failure, and reporting results, so features don't need to reimplement
  routing logic.
- `/admin/settings` UI extended: shows current fallback order, per-key priority
  (editable), cooldown/failure status, last successful use.
- Verified live deployment at https://career-compass-ai-9cd6f40c.vercel.app/ by
  fetching it directly — landing page renders correctly, no em-dashes, correct copy.
  Direct Vercel API access via MCP is still not working (repeated "No approval
  received" errors on `list_teams`/`list_projects` despite the connector showing as
  connected) — worth re-authorizing the connector if API-level access is needed later;
  fetching the deployed URL directly works fine as a substitute for now.


---

## 2026-07-13 (later still) — Replaced fabricated jobs with real ones, fixed color scheme

**Context:** Flagged, correctly, that the seeded jobs were fabricated and that the
navy+orange color scheme (mislabeled "Handshake-inspired" in the original CSS comment)
didn't match Handshake's actual current branding. Also requested: country/language
selector, richer footer, real company logos in the trust bar, motion/interactivity,
and continued 12-hour scraping.

**Real job data:** deleted all 52 fabricated jobs and 22 fabricated companies. Pulled
20 real, currently-live listings via direct web search against BrighterMonday Kenya,
Fuzu Kenya, and RemoteOK — real companies, real source URLs, paraphrased (not copied)
descriptions per copyright rules. Reseeded 114 applications against the real job set.
Demo recruiter/company accounts relinked to real jobs/companies (The Lucrebag).

**Design:** removed the orange accent entirely, replaced with navy + one vivid indigo
accent (`oklch(0.56 0.19 275)`), light and dark mode. Added Framer Motion to the trust
bar (staggered entrance, hover scale) and category cards (hover-reveal purpose copy).
Footer rebuilt: 5 columns, real LinkedIn/Instagram icons with hover motion, added The
Lucrebag as a company link.

**Declined a specific request, again:** did not embed actual trademarked logo artwork
for Safaricom/Jumia/etc. in the trust bar. Used clean typographic wordmarks instead,
standard practice without a formal logo-usage agreement with each company. This is a
design choice, not a technical limitation — revisit if you get explicit permission or
have official brand-kit assets to use.

**Explicitly not done this session** (see PROJECT_AUDIT.md §5, gaps G8–G10): the
recurring 12-hour scraping cron (needs a Firecrawl key, which hasn't been added — only
Gemini has), the country/language selector with Google Translate, and verifying the
recruiter/company dashboard's "shortlisted candidates" and "my posted jobs" views
actually exist in the UI as built.

---

## 2026-07-13 (continued) — Country/language selector, corrected G10 status

**Verified G10 (recruiter dashboard) was already built**, not a gap: `recruiter.tsx`
(posted jobs list), `recruiter.applicants.$jobId.tsx` (shortlist/proceed/reject +
templated messages), `recruiter.new-job.tsx` (post a job). Corrected the audit rather
than leaving a stale gap entry.

**Built G9 — country/language selector:**
- `src/lib/geo.functions.ts`: server function reading Vercel's automatic
  `x-vercel-ip-country`/`x-vercel-ip-city` headers — zero-config, no geo-IP API key
  needed, only works in Vercel's production environment (not locally).
- `src/components/region-language-switcher.tsx`: country dropdown (10 African +
  Western markets) with localStorage persistence, language dropdown driving Google's
  official Website Translator widget loaded globally, `notranslate` class applied to
  the switcher UI itself so it doesn't get caught in its own translation.
- Wired into both the public landing nav and the authenticated `AppShell` header.

**Not yet verified:** the geo-detection can only be confirmed against the live Vercel
deployment (the header doesn't exist locally) — check that the detected country looks
right once this deploys.

---

## 2026-07-14 — G8 shipped: real 12-hour scraping cron, wired to Vault Firecrawl key

**Context:** Firecrawl key added at `/admin/settings`. Went to wire up the recurring
scraping job (G8), which surfaced and required fixing three real problems in sequence,
documented here rather than glossed over.

1. `scrape.server.ts` was reading `process.env.FIRECRAWL_API_KEY` directly, which was
   never set — the key lives in Vault via `/admin/settings`, not an env var. Added
   `get_provider_key(text)` RPC (service_role only, same security posture as
   `get_next_ai_key()`) and wired `getFirecrawl()` to use it, with an env var fallback
   for local dev. Also wired success/failure reporting through
   `report_ai_key_result()` so Firecrawl's health shows up in the same tracking as the
   LLM provider keys.
2. Scheduled `pg_cron` job `scrape-jobs-every-12h`, calling the live
   `/api/public/hooks/scrape-jobs` webhook via `pg_net`.
3. **Manually triggered the webhook multiple times to verify it actually works**,
   rather than trusting the schedule blindly:
   - First attempt (against pre-fix code): confirmed exactly the expected failure
     (`FIRECRAWL_API_KEY is not configured`) across all 5 sources.
   - After the fix deployed: sequential-loop scraping of 5 sources hung past even a
     120s `pg_net` timeout.
   - Parallelized with `Promise.allSettled`: still hung past 90s with zero response.
   - Isolated with 1 source: succeeded (~20s, though 0 jobs found for that specific
     source's page structure).
   - Isolated with 2 sources concurrently: succeeded (~30s), found real jobs (Fuzu
     Kenya: 10, Remote OK: 3).
   - Root cause of the 5-way hang not fully diagnosed — no Vercel function log access
     this session (the Vercel MCP connector has been broken all session, "No approval
     received" on every call). Fixed pragmatically instead: batch concurrency to 2
     sources at a time.
   - **Final verified run, all 5 sources**: We Work Remotely (8), Remote OK (5), Fuzu
     Kenya (10), MyJobMag Kenya (20), BrighterMonday Kenya (16). 172 real jobs now in
     the database, all with genuine source URLs.

**If this breaks again:** check `job_sources.last_status`/`last_error` first, then
manually trigger via `SELECT net.http_post(...)` against the live URL (see the
migration file for the exact call) and poll `net._http_response` — that's how this was
debugged, and it doesn't require Vercel dashboard access.

---

## 2026-07-14 (continued) — G1 shipped: found and fixed the real blocker, plus a real production bug along the way

**Major discovery:** went looking to build employability scoring + skill-gap analysis
from scratch (per the audit's G1 gap) and found `ai.functions.ts` already had all of
it — employability scoring, skill-gap analysis, resume ATS optimization, career
recommendations, cover letter generation, interview kit generation — plus working UI
pages for all of it. The original audit's "G1/G2 not built" status was wrong; this
file wasn't found during the original audit pass. Correcting that here rather than
letting it stand.

**The actual problem:** every one of those AI calls went through Lovable's proprietary
AI gateway (`ai.gateway.lovable.dev`), which needs a Lovable Cloud workspace +
`LOVABLE_API_KEY` — meaningless now that the app has moved off Lovable's
infrastructure entirely.

**Fix:** new `src/lib/ai-model.server.ts`, resolves the best available key via the
same `get_next_ai_key()` Vault system built for G8's Firecrawl fix, builds an
OpenAI-compatible client against the real provider endpoint (Gemini's official
OpenAI-compat endpoint, confirmed via Google's own docs:
`generativelanguage.googleapis.com/v1beta/openai/`). Rewired all 6 call sites in
`ai.functions.ts` plus the profile-import structuring call. Deleted the now-fully-dead
`ai-gateway.server.ts`. Bonus: skill-gap analysis now pulls real, currently-open job
postings' required skills (frequency-ranked) into the prompt instead of letting the
model invent role requirements from nothing.

**A real, separate production bug found and fixed along the way:** `src/routeTree.gen.ts`
(auto-generated by the TanStack Router plugin) was checked into git. This meant new
route files added in earlier sessions weren't necessarily reflected in what got
deployed — confirmed `/admin/settings` (built two sessions ago) was returning 404 in
production this whole time, because it was never in the stale committed tree. Fixed by
gitignoring the file and running a full local build to regenerate it correctly before
pushing; confirmed via direct HTTP testing that `/admin/settings` returns 200 now.

**Not fully resolved:** discovered that brand-new standalone API route files under
`src/routes/api/public/hooks/*.ts` 404 in production even when correctly present in
the regenerated route tree — tested with two different fresh filenames, both failed,
while the pre-existing `scrape-jobs.ts` at the same path pattern works fine, and page
routes (`/admin/settings`, `/employability`, `/skill-gap`) all work fine. Couldn't
diagnose further without Vercel build/routing logs (the Vercel MCP connector has been
broken all session). Removed the debug files rather than leave broken routes in the
tree. Flagging this as a real open question — avoid adding new standalone API route
files until understood; use TanStack Start server functions instead, which are proven
working throughout the rest of the app.

**Verification level achieved:** confirmed `/employability` and `/skill-gap` resolve
correctly in production (200 OK). Could not trigger and observe an actual live AI
response end-to-end — that requires a real authenticated browser session, which wasn't
achievable from this session's server-side testing tools. **Next session or you: log
in as `demo.student@careerpilot-demo.io` and try the employability score page. If it
errors, check `ai_provider_keys.last_error` for the `gemini` row first.**

---

## 2026-07-14 (continued) — Full demo profiles + real sample resumes for testing

**Requested:** complete, realistic profiles with sample resumes for the demo accounts,
specifically to test employability scoring and skill-gap analysis before continuing to
the next stage.

**Done:**
- `demo.student@careerpilot-demo.io` (Amara Student): full career profile (9 skills,
  2 work history entries including a real internship narrative, 1 certification —
  Meta Front-End Developer Professional Certificate) plus a complete, realistic resume
  in `resumes.raw_text` with summary, education, experience, 2 projects, skills, and
  certifications sections, written the way an actual CS student's resume reads.
- `demo.graduate@careerpilot-demo.io` (Brian Graduate): same depth — 8 skills, 2 work
  history entries (Twiga Foods sales internship with a quantified outcome, a
  university society volunteer role), 1 certification (HubSpot Inbound Sales), full
  resume text.
- Fixed a data inconsistency: `demo.company`'s profile headline still said "Zamara
  Digital" (a fabricated company removed in an earlier session) even though ownership
  had been relinked to The Lucrebag — corrected.
- `demo.recruiter` and `demo.company` intentionally left without career_profiles/resumes
  — they're employer-side accounts, a career profile doesn't apply to them the way it
  does to a job seeker.

**Note for testing:** the resumes were deliberately left without a pre-filled
`ats_score`/`analysis` — that's what the ATS review feature (part of the G1 fix) is
supposed to generate when you actually test it, pre-filling it would defeat the point
of testing.

**Status:** handed back for user testing (employability score, skill-gap analysis,
resume ATS review) before proceeding to G2.

---

## 2026-07-16 — Critical fix: found and fixed the real deployment blocker

**What happened:** you sent a screenshot showing "Missing LOVABLE_API_KEY" on the live
`/skill-gap` page, an error message that only existed in code deleted several commits
earlier, and said the app showed no changes at all. That was the tell. Asked you to
check the Vercel dashboard's Deployments tab directly, since the Vercel MCP connector
has been broken and log-inaccessible this entire session.

**What the dashboard showed:** commit `635f529` (the first Firecrawl-key fix) deployed
successfully. The very next commit, `78af833` — which added a `vercel.json` with a
`functions` block for `api/public/hooks/scrape-jobs` — failed. Every single commit
after that failed too: 13 consecutive failed deployments, each failing in 1-6 seconds.
That's too fast to be a real `vite build`; it's a config validation error rejected
before the build even starts. The site had been silently serving the `635f529` build
this entire time, while I kept testing against what I believed was a live, current
deployment.

**Root cause:** `vercel.json`'s `functions` block referencing a route path that doesn't
correspond to a literal file in Vercel's traditional serverless-function layout —
incompatible with this project's actual deployment mechanism (Nitro's Build Output API
v3, confirmed earlier by inspecting `.vercel/output/config.json`, which is a simple
catch-all with no function-specific config at all).

**Fix:** deleted `vercel.json` entirely. The scraping timeout issue it was originally
added for is already handled by the batching fix (2 sources concurrently) from
earlier — removing it shouldn't reintroduce that problem.

**Verified after the fix, all via direct HTTP testing, not assumption:**
- `/` (homepage) — 200, confirmed via full content fetch: real trust bar (Copia, The
  Lucrebag), real LinkedIn/Instagram footer icons, Kenya/English switcher, all live.
- `/browse/` — 200 (this was the route stuck 404ing for two full sessions; not a
  routing bug after all, just never actually deployed)
- `/skill-gap` — 200
- `/admin/settings` — 200

**Retrospective — what this means for everything "shipped" between `78af833` and this
fix:** the AI gateway rewrite (G1), the real jobs replacement, the routeTree.gen.ts
fix, the certifications library, public job browsing, the subscription/quota bug fix —
all of it was correctly committed to GitHub the entire time, but **none of it was
actually live until this fix deployed**. The code was right; the deployment pipeline
was broken. Re-verify anything you tested against the live site before this point,
since you may have been looking at the pre-`78af833` build the whole time.

**Process note for future sessions:** HTTP-status checks alone (200 vs 404) aren't
sufficient to confirm a deployment is current — as this incident showed, a 200 can
come from a stale build that happens to already contain that route. Check response
*content* against something known to have changed recently when verifying a deploy,
the way the homepage content check above was used here.

---

## 2026-07-17 — G1 AI features confirmed genuinely working; added mandatory verification protocol

**Third and final bug in this chain**, found via a career-recommendations screenshot
showing Zod validation errors: Gemini returns numbers as quoted strings (`"85"`) in
JSON despite explicit prompt instructions not to. Grepped all 5 AI schemas — 7 numeric
fields across employability, resume ATS, and career recommendations were equally
exposed, not just the one that happened to error first. Fixed once at the root with a
`coerceNumericStrings()` pass inside `generateStructured()`, rather than waiting for
individual bug reports on each field.

**After this fix**: employability score, skill-gap analysis, and career
recommendations were each confirmed by the user producing real, correctly structured
AI output. This closes out the three-bug chain from this session (Firecrawl leaking
into the LLM pool → Gemini's `responseFormat` not actually working → numbers arriving
as strings), on top of the separate `vercel.json` deployment-breakage incident from
earlier the same day.

**Added a "Verification protocol" section to `PROJECT_AUDIT.md`** — a permanent,
mandatory checklist distilled from this session's mistakes, most importantly: an HTTP
200 is not proof of a healthy deploy, and no AI feature gets marked "working" without
having actually seen real output from a real run, not just an absence of errors.

**User feedback driving this entry**: asked to stop the reactive fix-only-when-broken
loop and instead build step by step with concurrent auditing, so future problems are
caught by the process itself rather than by the user re-testing and re-reporting.
Going forward: any new feature gets its own live-tested verification before being
marked done in the audit, not marked done on the strength of a local build succeeding.

---

## 2026-07-18 — Fixed landing-page "logout," onboarding crash, shipped formula-first employability scoring

**User feedback, direct:** going in circles on AI reliability chasing, burning time. Stop
perfecting the AI plumbing in isolation and (a) fix the two real bugs just found, (b)
ship the deterministic-formula-first employability scoring that was asked for
explicitly earlier, (c) move fast through the remaining G-gaps rather than continuing
to test-and-patch one feature at a time.

**Bug found and fixed — landing page looked like it logged users out.** It never
checked real session state client-side; always rendered "Log in / Sign up" regardless
of whether the visitor was authenticated. Fixed: checks `supabase.auth.getSession()` +
`onAuthStateChange()`, shows "Go to dashboard" for an authenticated visitor.

**Bug found and fixed — onboarding hard-crashed going from Skills to Education.** Root
cause: `career_profiles.education` records (both seeded and from any other write path)
use `{school, degree, field, year}`; the onboarding form's local shape has always been
`{institution, qualification, year}`. The code cast the raw record directly into the
form's type with zero field mapping, so every value read as `undefined`, and the
Education step's render threw — caught by the router's hard error boundary ("This page
didn't load"). Fixed with `mapEducationRecord()`, which reads either naming convention
defensively.

**Shipped: employability score is no longer invented by the LLM.** New
`computeEmployabilityScore()` — real math: skill breadth + real overlap against
currently-open job postings' required skills in the candidate's field, experience
level + work history count, education completeness, and market fit (% of real open
jobs the candidate's skills strongly match). The LLM's schema no longer even has a
`score` or `breakdown` field to fill in — its only job now is explaining the
already-computed numbers (strengths, weaknesses, next actions), grounded in the exact
facts behind them.

**Also cleared** the Gemini key's circuit-breaker cooldown, which had correctly
tripped from the structured-output bugs fixed earlier and was then correctly (if
confusingly) reporting "no active AI provider key" rather than the real underlying
error — not a new bug, just needed manual reset after the underlying cause was fixed.

**Process going forward, per explicit user direction:** move through the remaining
G-gaps faster and broader rather than continuing single-feature reliability loops;
consolidate testing to batched checkpoints rather than a screenshot-per-fix cycle.

## 2026-07-18 (continued) — G20 and G23 shipped

Moving faster through remaining gaps per explicit user direction. Shipped without a
back-and-forth testing cycle for these two (both are low-risk, self-contained UI
changes, verified via local build success rather than live screenshot testing —
appropriate given how self-contained and low-risk they are, unlike the AI-wiring
bugs which needed live verification):
- **G20**: full 195-country ISO list (via `Intl.DisplayNames`) with search, replacing
  the 10-country curated list; language list expanded 6 → 35. Country-to-language
  auto-suggestion (selecting Kenya prompts English/Swahili specifically) not yet done.
- **G23**: dark/light mode toggle now on the public landing page, previously only
  available inside the authenticated app.

Remaining open gaps: G2 (real certifications tied into a roadmap), G6, G7 (career
roadmap, mentor/community links — need real curated data), G11-G17 (LinkedIn-style
profile, OAuth sign-in, job alerts, resume management UI, applications tracking/
analytics), G18-G19 (already partially done — certifications library exists, general
career-path library does not), G21-G22 (help redesign, notifications), G24-G27
(another design pass, WordPress-style CMS, social features, periodic survey review).

## 2026-07-18 (continued) — G22 shipped and verified live; two more real column-name bugs found and fixed

**Found another real bug while working nearby**, same class as the earlier `plan` vs
`tier` and `education` field-naming mismatches: `feed.functions.ts` and
`dashboard.tsx` both queried/read `notifications.read_at`, a column that has never
existed — the real column is `read` (boolean). Fixed both.

**Shipped G22 — new-job notifications, verified with a real scraper trigger, not just
a clean build:**
- `scrape-jobs.ts` now distinguishes genuinely new job inserts from re-scraped
  existing rows using `created_at` (never included in the upsert payload, so it only
  changes on a real insert) — a correctness detail that matters, since a naive
  "count everything scraped this run" would notify users constantly for jobs that
  already existed.
- Matches new jobs against each user's `target_role`; only notifies users with a real
  match, not everyone.
- Bell icon in the app header now shows a live unread count (polled every 60s, marked
  read on dashboard view).
- **Manually triggered the scraper against production to verify end to end**: 76 jobs
  scraped total, 5 correctly identified as genuinely new, 9 notifications correctly
  generated and worded for matching users. Caught and fixed a subject-verb agreement
  bug ("1 new job match" → "1 new job matches") from the real output. Test
  notifications cleaned up after confirming.

## 2026-07-18 (continued) — G15 and G16/G17 shipped

**G15 (resume history)**: found another real bug while building this —
`resumes.title` is `NOT NULL` in the schema but `optimizeResume()`'s insert never set
it. This means the resume ATS feature would have hard-failed on insert for any real
user's first analysis (the seeded demo resumes worked only because I set title
directly via SQL when seeding). Fixed. Also shipped the actual UI the user asked for:
a "Your resumes" history list showing every past ATS run with title, date, target
role, and score, clicking one loads that saved analysis instead of the page always
starting blank.

**G16/G17 (applications)**: job titles in the applications list now link to the job
detail page. Added a real analytics summary — total applications, active count,
response rate, average days-to-response — computed from actual data, not fabricated.
Not done: distinguishing external vs. in-app applications, and the visual step-by-step
status timeline the user specifically asked for ("I call it a map") — currently just a
status badge; logged honestly as not done rather than glossed over.

## 2026-07-18 (continued) — G19 shipped

New `career_paths` table: 14 real career fields (real descriptions, genuine entry-level
job titles, core skills, typical progression), same pattern as the certifications
library — always visible on the recommendations page, no AI run required first.

## 2026-07-18 (continued) — G14 shipped and verified end to end

New `job_alert_preferences` table + Job Alerts card on the profile page (keywords,
work-mode filters, on/off toggle). Wired into the same notification logic built for
G22 — matches new jobs against a user's explicit keyword alerts in addition to their
target_role, deduped to one combined notification per user rather than two separate
ones. **Verified with a real end-to-end test**: set a live preference for the demo
student ("engineer", "developer"), triggered the scraper against production, confirmed
the correct notification landed ("1 new job matches your alerts... matching 'engineer',
'developer'"), then cleaned up the test data.

---

## 2026-07-20 — Real auth bugs found and fixed via production logs; anonymous guest access shipped

**Pulled real Supabase Auth logs and found 3 serious, confirmed bugs affecting real
users right now:**
1. Every confirmation email link points to `localhost:3000`, not production —
   confirmed against real signups from real Kenyan IPs. Root cause is the Supabase
   Auth "Site URL" dashboard setting (not app code, `emailRedirectTo` in the code was
   already correct). Cannot fix via any available tool — needs a 2-minute dashboard
   change, documented for the user with exact steps.
2. Repeated `429: email rate limit exceeded` — Supabase's default email sender has a
   very low cap and real people are hitting it. Same category, needs custom SMTP or a
   rate-limit adjustment in the dashboard.
3. Google sign-in went through `@lovable.dev/cloud-auth-js` (Lovable's own hosted
   OAuth broker) — meaningless outside Lovable's infrastructure, same dead-dependency
   pattern as the AI gateway fixed earlier. Replaced with native
   `supabase.auth.signInWithOAuth()`. Still needs a real Google Client ID/Secret in
   Supabase's Auth provider settings to work end to end.

**Also found and fixed a real UX bug**: after signup, the app immediately navigated to
`/dashboard` and said "Welcome!" even when email confirmation is required (confirmed
from the logs) — meaning there's no session yet, so the user would hit a broken or
logged-out dashboard right after being told they're in. Replaced with a proper,
app-branded "Verify your CareerPilot account" pending screen (never mentions
Supabase), with a resend-email option.

**Shipped anonymous guest access, the actual feature requested**, per: "a new user
does not need to sign up for basic functionalities... in order to gain extended 5 more
daily uses... they would need to sign up."
- New `anon_usage` table + `check_and_consume_anon_quota()` — device-ID-based (a UUID
  generated client-side into localStorage), 2 free checks/day, protected by a
  SECURITY DEFINER RPC with zero direct table grants so it can't be reset by clearing
  rows client-side. Tested directly in SQL: 2 calls succeed, 3rd correctly blocked.
- Raised the signed-up free tier from 2 runs/month to 7 runs/day (2 base + 5 signup
  bonus) — reused the existing `ai_run_usage.period_month` column to hold a day-key
  instead of a month-key, no new table needed for this part.
- New public `/try` page: a real, working anonymous employability check. No account,
  nothing saved to `career_profiles`. Ends with a specific, genuine value pitch (7
  runs/day vs. 2, skill-gap analysis, resume ATS, cover letters, interview prep,
  application tracking) rather than a generic "sign up now."
- **Verified fully end to end against production**, not just built: real computed
  score, real AI narrative, and confirmed the 3rd same-day call is correctly blocked
  with the intended upsell message.
