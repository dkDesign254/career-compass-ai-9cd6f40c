# CareerPilot AI — Changelog

All notable changes documented per run. See `docs/runs/` for detailed per-run notes.

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