# Run 01 — Foundation

**Date:** 2026-06-29
**Scope:** Authentication, schema, design system, app shell, animated 404, docs.

## What changed

### Backend (Lovable Cloud)
- **Enabled** Lovable Cloud (Postgres + Auth + Storage).
- **Schema** — 15 tables created with RLS enabled and GRANTs:
  - `profiles`, `user_roles`, `career_profiles`, `resumes`, `companies`, `jobs`,
    `applications`, `generated_documents`, `interview_sessions`, `subscriptions`,
    `ai_run_usage`, `feedback_threads`, `feedback_messages`, `notifications`,
    `blog_posts`, `audit_log`.
- **Enum** `public.app_role`: `student | recruiter | company_admin | admin | cms_editor`.
- **Security-definer functions:**
  - `public.has_role(uuid, app_role)` — used by RLS policies; EXECUTE restricted to `authenticated` + `service_role`.
  - `public.handle_new_user()` — trigger on `auth.users` creates a profile + assigns `student` role on signup.
  - `public.tg_set_updated_at()` — generic updated_at trigger.
- **Auth:** email/password + Google (managed broker). HIBP enabled. Auto-confirm email on.

### Frontend
- **Design tokens** (`src/styles.css`): brand navy `oklch(0.28 0.09 255)`, coral `oklch(0.72 0.17 32)`, teal `oklch(0.72 0.13 195)`; new `--color-brand/coral/teal` Tailwind tokens; `bg-grid`, `glow`, `text-gradient` utilities; Space Grotesk + Inter via `@fontsource`.
- **Theme provider** (`src/components/theme-provider.tsx`): light/dark/system with `localStorage` persistence.
- **Routes added:**
  - `/` (public landing) — hero, features grid, how-it-works, CTA, footer.
  - `/auth` — sign in / sign up tabs, Google OAuth, forgot password.
  - `/reset-password` — sets new password after recovery link.
  - `/_authenticated/route.tsx` — `ssr: false` gate; redirects to `/auth` when no session.
  - `/_authenticated/dashboard.tsx` — welcome card, stats, module grid.
  - `/_authenticated/onboarding.tsx` — placeholder for Run 2.
- **Components:** `app-shell`, `theme-toggle`, `help-button` (tour dialog), `animated-not-found` (framer-motion compass 404).
- **Root layout** (`src/routes/__root.tsx`): QueryClientProvider, ThemeProvider, Sonner toaster, `onAuthStateChange` listener with filtered invalidation, brand metadata.

### Dependencies added
- `@lovable.dev/cloud-auth-js`, `framer-motion`, `@fontsource/space-grotesk`, `@fontsource/inter`.

## Manual test checklist

- [ ] Visit `/` — landing renders, theme toggle works.
- [ ] Click "Get started" → `/auth` opens; sign up with email + password; redirected to `/dashboard`.
- [ ] Sign out from sidebar → returns to `/auth`.
- [ ] Sign in with Google → lands on `/dashboard`.
- [ ] Visit `/garbage-url` → animated 404 renders.
- [ ] Help icon (top bar) opens tour dialog.
- [ ] Verify in Backend: a `profiles` row + `user_roles` row (role=`student`) exist for the new user.

## Known gaps (deliberately deferred)

- Onboarding wizard is a placeholder — full implementation in **Run 2**.
- No AI modules yet — **Run 2**.
- No recruiter/admin portals — **Run 3 / Run 5**.
- No job scraping — **Run 4**.
- No subscriptions/Stripe — **Run 5**.

## Linter notes

- One `0029_authenticated_security_definer_function_executable` WARN remains on
  `public.has_role`. This is the canonical Supabase pattern for RLS helpers —
  `authenticated` MUST be able to execute it for policies to work. Accepted.
- All other security-definer functions had EXECUTE revoked from `PUBLIC`,
  `anon`, and `authenticated`.

## Env vars (auto-managed by Cloud)

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`