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
  - Supabase, not the paper's original Next.js + FastAPI description). Rendered each to
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

**Open question carried forward:** the ChatGPT share link provided did not return
readable content via fetch. If it contains requirements not already captured, paste
its content directly next session.
