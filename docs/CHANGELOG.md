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

