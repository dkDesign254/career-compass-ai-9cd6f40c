# Run 06 — Design reset: editorial landing (Handshake × LinkedIn)

Scope of this run is intentionally narrow: **visual language and the landing page only**. Feed dashboard, on-platform job rendering, OAuth imports, journey walkthrough, seed data and admin CMS-of-strings are queued for Runs 07–11 as agreed.

## What changed

### Design tokens (`src/styles.css`)

- New palette blending Handshake AI (ivory canvas, singular orange accent) with LinkedIn (trusted blue as the primary CTA color) and a sage neutral for calm surfaces.
  - `--background` #FBFAF7 ivory · `--foreground` near-black ink
  - `--primary` #0A66C2 LinkedIn blue · `--accent` #F26B3A Handshake orange
  - `--secondary` sage · dark sidebar preserved for AppShell contrast
- Full dark-mode counterpart re-derived (ink canvas, brighter blue, same orange accent).
- Reduced default `--radius` from `0.75rem` to `0.625rem` for a more editorial feel.
- Heading weight dropped to 500 and letter-spacing loosened slightly to match serif display font.

### Typography (`src/routes/__root.tsx`, `package.json`)

- Replaced Space Grotesk with **Fraunces** (variable serif) as the display face; Inter kept as body sans.
- Fontsource weights loaded: 400/500/600.

### Landing page (`src/routes/index.tsx`) — full rewrite

- Removed the gradient hero, blur orbs, `bg-grid`, motion-heavy feature grid, and gradient CTA panel.
- New structure:
  1. Minimal sticky nav with pill CTA.
  2. Editorial hero — Fraunces headline with italic accent phrase, kicker "Issue 01 · Careers, clarified", and a photographic hero image on the right.
  3. **Live jobs strip** — pulls the six most recent `open` jobs from the database via a new public server fn (no hardcoding).
  4. Three pillars (Signal / Craft / Motion) — kicker + serif title + short body, no icons, no cards.
  5. Journey teaser section for the upcoming "house → cockpit" walkthrough (Run 07).
  6. Closing serif CTA + footer.
- No blurred orbs, no gradients, no framer-motion entrance choreography — cleaner, more editorial, less "AI-built".

### Public jobs preview (`src/lib/public-jobs.functions.ts`)

- New server function `getPublicJobsPreview` — read-only, selects only safe columns (`id, title, location, source, created_at, is_scraped, description`) from `jobs where status = 'open'`, limit 6, most recent first.
- Uses `supabaseAdmin` server-side so no `jobs` RLS policy had to be widened for anonymous visitors.
- Consumed on the landing page via `@tanstack/react-query` with a 5-minute stale time.

### Assets

- `src/assets/hero-landing.jpg` — editorial photograph of a young professional at sunrise (generated, licensed for project use).

## Not in this run (deferred, in order)

- Run 07: Social-feed dashboard + "Journey" onboarding animation (house → cab → toll booth → terminal → gate → cockpit).
- Run 08: On-platform job rendering — full description, compatibility score, "people to contact", jobs matching alerts/preferences.
- Run 09: Scraper expansion (Fuzu, Corporate Staffing, additional Kenyan + international sources) + realistic demo/seed data for admin review.
- Run 10: OAuth (LinkedIn, GitHub, Google) + profile-URL cross-reference import (Fuzu, Upwork, Freelancer, Handshake).
- Run 11: Admin polish — API-key manager and CMS-of-strings so every front-end copy block is DB-driven and editable.

## Files touched

- `src/styles.css` (rewritten tokens)
- `src/routes/__root.tsx` (font swap)
- `src/routes/index.tsx` (full rewrite)
- `src/lib/public-jobs.functions.ts` (new)
- `src/assets/hero-landing.jpg` (new)
- `package.json` (added `@fontsource/fraunces`, removed reliance on `@fontsource/space-grotesk` for the landing)
- `docs/AUDIT.md` (new — baseline snapshot)
- `docs/runs/RUN-06.md` (this file)
- `CHANGELOG.md` (Run 06 entry)

## Verification checklist

- Landing renders with new palette and Fraunces headings.
- Live jobs strip shows real DB rows once scraper has populated `jobs`; graceful empty state otherwise.
- Existing AppShell / dashboard / admin routes continue to compile — tokens they consume (`--primary`, `--accent`, `--sidebar-*`) are all still defined.
