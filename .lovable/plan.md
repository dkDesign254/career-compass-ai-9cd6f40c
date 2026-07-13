# CareerPilot — Rebuild plan (Runs 6–11)

Each run ends fully shipped, documented (`docs/runs/RUN-XX.md`), and independently reviewable. No run starts until prior run's doc + changelog are written.

## Ground rules (apply to every run)

- One repo only: `dkDesign254/AI-Career-Navigator` (GitHub sync — user must connect via UI).
- Zero hardcoded content on user-facing pages. Everything reads from DB. Seed via migrations, not JSX.
- All admin surfaces = full CRUD, audit-logged.
- No LinkedIn/Indeed/Glassdoor scraping (ToS). Scrape-friendly sources only.
- Every color/font is a semantic token. No `text-white`/`bg-[#...]` in components.
- Journey metaphor = onboarding + replayable `/tour`, NOT primary nav.

---

## Run 6 — Audit + Design reset

**Goal:** honest baseline + new visual identity before any feature work.

1. **Audit doc** `docs/AUDIT.md`: every route, every table, every server fn, every gap vs. this plan. Marks what stays / rewrites / deletes.
2. **New palette + typography** (Handshake × LinkedIn blend):
   - Ivory `#FBFAF7` bg, ink `#0A0A0A` text, LinkedIn blue `#0A66C2` primary, Handshake orange `#F26B3A` accent, muted sage `#E8EFEA` surface.
   - Serif display: **Söhne Breit / Fraunces** (headlines) + **Inter** (body). Install via `@fontsource`.
   - Rewrite `src/styles.css` tokens (oklch).
3. **New landing page** (`/`): editorial hero, live jobs strip (pulled from DB), 3 value props with real Fuzu-style illustrations (I'll generate), testimonial slot (seeded), footer.
4. **Kill AI-slop imagery**: replace generic gradients with commissioned-style generated hero art.
5. Doc: `docs/runs/RUN-06.md` + `CHANGELOG.md` entry.

**Ships:** new landing, new tokens, audit doc. Nothing else touched.

---

## Run 7 — Feed dashboard + Journey onboarding

1. `/dashboard` becomes a **feed**: job matches, application updates, skill tips, recommendations — chronological, LinkedIn-feed shape.
2. **First-run journey** (`/tour` + auto-trigger post-signup): 7 scenes (house → cab → toll → airport → terminal → gate → cockpit), each scene = one platform concept. Framer-motion scene transitions, clickable hotspots. Replayable from Help menu.
3. **Help center** (`/help`): searchable, DB-backed articles (new `help_articles` table).
4. Doc + changelog.

---

## Run 8 — Jobs on-platform

1. Extend scraper to capture **full description, salary, requirements** — store on `jobs`.
2. New route `/jobs/$jobId`: on-platform detail page (no outbound redirect as primary CTA; external link kept as secondary "view original").
3. **Per-job scores** (server-computed): compatibility, best-fit, alert-match, preference-match. Uses existing career_profile + AI gateway.
4. **Apply on platform** flow: uses stored resume, writes `applications` row.
5. **"People to contact"** stub: list of company contacts from `companies` table (seeded, editable in admin).
6. Doc + changelog.

---

## Run 9 — Scraper expansion + seeding

1. Curated source list (all confirmed answers): BrighterMonday, Fuzu, MyJobMag, Corporate Staffing, RemoteOK, WeWorkRemotely, Remotive, Upwork public, Freelancer public, + 10 KE company ATS pages (Safaricom, Equity, KCB, etc.).
2. Per-source **selector overrides** in `job_sources` for pages Firecrawl struggles with.
3. **Seed migration**: 50 realistic scraped jobs + 20 demo users with resumes/ATS runs/scores for admin review.
4. Admin UI: "Add source" wizard with URL test-run preview.
5. Doc + changelog.

---

## Run 10 — Integrations (realistic)

1. **LinkedIn OAuth** (basic profile) + **GitHub OAuth** — via Lovable Cloud managed social + Supabase provider config.
2. **Profile-URL import**: user pastes LinkedIn/Fuzu/Upwork/Freelancer/Handshake URL → Firecrawl scrape → parse via AI gateway → prefill `career_profiles`.
3. **GitHub repo import**: auto-populate projects section.
4. Social share out: LinkedIn post via user's OAuth token (basic w_member_social if scope granted; else copy-to-clipboard fallback).
5. Doc + changelog.

---

## Run 11 — Admin polish + gap close

1. **API key manager** UI (`/admin/api-keys`): add/rotate/delete Firecrawl, Lovable AI, provider keys via secrets tools. Super-admin only.
2. **Content editor**: every landing-page string, hero image, testimonial, help article — editable via admin CMS. Zero hardcoded copy remains.
3. **Full audit sweep**: any front-end field not editable server-side gets an admin form.
4. **SEO pass**: unique title/description per route, sitemap, JSON-LD.
5. Doc + changelog.

---

## Technical notes

- Palette tokens (oklch) written to `src/styles.css` `:root` + `.dark`. Sidebar, cards, chart colors all re-derived.
- Fonts via `@fontsource/fraunces` + `@fontsource/inter` imported in `src/main.tsx` or root route (check current wiring first).
- Journey scenes: 7 generated illustrations (fast tier, ~1024×640 jpg) stored in `src/assets/journey/`.
- Job detail scoring: single server fn `scoreJobForUser(jobId, userId)` cached 24h in a `job_scores` table.
- LinkedIn OAuth: `supabase--configure_social_auth` with `["google","linkedin_oidc"]`; GitHub via same tool if supported, else Supabase provider config.
- URL-import parsers: one `parseProfileFromUrl(url)` server fn → Firecrawl scrape → Gemini structure → returns `Partial<CareerProfile>`.
- Seed data lives in `supabase/migrations/*_seed_demo.sql` — not in code.

## What I need from you to start Run 6

Just: **"go"**. Palette, sources, integrations, landing shape are all locked from your answers above.

GitHub sync: connect via chat + menu → GitHub → Connect (only you can do this). I'll keep pushing to the same repo automatically once connected.
