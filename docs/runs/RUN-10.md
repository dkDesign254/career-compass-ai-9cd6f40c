# Run 10 — Profile-URL import (realistic integrations)

## Reality check first

Lovable Cloud managed OAuth only supports **Google** and **Apple**. LinkedIn and GitHub OAuth are not available on this stack, so the plan's "LinkedIn + GitHub OAuth" bullet is replaced by profile-URL import, which delivers the same user value (auto-fill your profile from an existing account) without an unsupported OAuth flow.

## Shipped

- `src/lib/profile-import.functions.ts` — two admin-free, user-scoped server fns:
  - `previewProfileImport({ url })` — routes by URL:
    - **GitHub** (`github.com/<user>`): public GitHub REST API, no scraping, no AI cost. Returns bio, location, languages (as skills), and up to 10 non-fork repos as `projects`.
    - **LinkedIn** (`linkedin.com/in/*`): honestly rejects with a message pointing to GitHub/portfolio — LinkedIn blocks scrapers.
    - **Generic** (any other URL): Firecrawl markdown scrape → Gemini 2.5 Flash structured `generateObject` into a `Partial<CareerProfile>` (role, industry, locations, skills, work history, education, certifications, goals, projects).
  - `applyProfileImport({ parsed, mode })` — merge or replace fields on the current user's `career_profiles` row. Merge deduplicates skills, appends lists, keeps existing scalars.
- `/profile` gets an **Import from a URL** card with a preview → apply flow: badges for parsed skills, list of work history and projects, `Merge` and `Replace fields` buttons.

## Deferred (from plan)

- Social share out (LinkedIn post via user OAuth): unsupported on Lovable Cloud (no LinkedIn OAuth). If we do this, it'll be a copy-to-clipboard fallback in Run 11.
- Wellfound/Fuzu/Handshake URL parsers with per-site prompts: the generic Firecrawl+AI path handles them already; only revisit if we see repeated bad output.

## Next

Run 11 — API-key manager UI, editable copy CMS, SEO polish.
