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
