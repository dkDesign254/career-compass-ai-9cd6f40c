# Run 04 — Job scraping (Kenya + international) & AI quota fix

## Goals

1. Fix the `ai_run_usage` RLS violation blocking every AI module.
2. Ship end-to-end job scraping: managed sources, admin dashboard, cron endpoint, deduped upsert, and a badged public job feed.

## Database

- `ai_run_usage` — added `INSERT` policy `Insert own usage` (`WITH CHECK auth.uid() = user_id`).
- `jobs` — added `is_scraped`, `source_url`, `external_id`, `scraped_at`; partial unique index `(source, external_id)` so re-scrapes upsert cleanly.
- `job_sources` — new table (`name`, `base_url`, `region`, `enabled`, `last_scraped_at`, `last_status`, `last_error`). Admins full CRUD, authenticated read-only. Seeded with BrighterMonday, MyJobMag, Fuzu, Remote OK, We Work Remotely.

## Server

- `src/lib/scrape.server.ts` — Firecrawl JSON-mode extraction with a strict schema; returns up to 40 normalized rows per source.
- `src/lib/scrape.functions.ts` — `listJobSources`, `toggleJobSource`, `addJobSource`, `runJobScrape({ sourceId? })`. Admin-gated via `has_role`. Normalizes work_mode / employment_type, hashes `(url|title)` into `external_id`, upserts via `supabaseAdmin` on `(source, external_id)`, writes back `last_status` / `last_error`.
- `src/routes/api/public/hooks/scrape-jobs.ts` — public POST endpoint gated by the `apikey` header (must match `SUPABASE_PUBLISHABLE_KEY`) for cron.
- `src/lib/jobs.functions.ts` — `listOpenJobs` returns `is_scraped`, `source`, `source_url` for badging + deep-link.

## UI

- `src/routes/_authenticated/admin.scraping.tsx` — admin dashboard: source list, per-source enable Switch and Scrape action, Run all now, add-source form, last-status / last-error indicators.
- `src/routes/_authenticated/jobs.tsx` — scraped rows show the source as a badge and open externally via `View on {source}`; internal jobs keep the in-app Apply dialog.
- `src/components/app-shell.tsx` — sidebar surfaces **Job Sources** for `admin`.

## Verifying

1. Grant yourself `admin` (`insert into user_roles(user_id, role) values (auth.uid(), 'admin')`), refresh, open `/admin/scraping`.
2. Click **Run all now** — status flips to `ok (n)`. `/jobs` now shows scraped rows with a coral source badge.
3. Any AI module — quota ticks without an RLS error.

## Cron

`POST /api/public/hooks/scrape-jobs` with header `apikey: <SUPABASE_PUBLISHABLE_KEY>`. Suggested cadence: every 6 h.

## Known limits / next

- Firecrawl extraction quality varies per site; if 0 rows returned, point `base_url` to a deeper listing page.
- No cross-source dedup yet.
- Scraped jobs are read-only in-app (no Apply / application_count).
- Run 05: subscriptions (Stripe), admin/CMS console, GDPR export/delete.
