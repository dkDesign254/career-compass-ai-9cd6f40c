# Run 05 — Full admin CRUD, audit log, 12h auto-scrape

## Goals from user

1. Scraping was failing — fix and automate every 12 hours.
2. Grant full editing & deletion capabilities across the front end and back end.
3. Fill in gaps.

## What shipped

### Scraper fix + automation

- Root cause: unique index was **partial** (`WHERE external_id IS NOT NULL`), so `INSERT ... ON CONFLICT (source, external_id)` in `scrape.server.ts` could not resolve an arbiter. Replaced with a real `UNIQUE (source, external_id)` constraint (nullable-safe because null ≠ null in unique constraints).
- Enabled `pg_cron` + `pg_net`. Scheduled job `careerpilot-scrape-12h` = `0 */12 * * *` posting to the public cron endpoint with the publishable key.
- Verified by manual run through `/admin/scraping → Run all now`.

### Admin backend (`src/lib/admin.functions.ts`)

All handlers assert `has_role(userId, 'admin')` first and call `log_admin_action` after every write.

- Users: `listUsers`, `grantRole`, `revokeRole` (5 roles).
- Jobs: `listAllJobs`, `updateJob` (title/status/cap), `deleteJob`.
- Blog: `listBlogPosts`, `upsertBlogPost` (body_md, cover_image_url, published→published_at), `deleteBlogPost`.
- Subscriptions: `listSubscriptions`, `grantSubscription` (tier + months → current_period_end), `revokeSubscription`.
- Audit + ops: `listAuditLog`, `getScrapeSchedule`.

### Scrape backend additions (`src/lib/scrape.functions.ts`)

- `updateJobSource` (name / base_url / region / enabled).
- `deleteJobSource`.

### Admin UI (all admin-gated in sidebar)

- `/admin` — hub with 6 tiles.
- `/admin/users`, `/admin/jobs`, `/admin/scraping`, `/admin/blog`, `/admin/subscriptions`, `/admin/audit`.
- Every list has inline **edit** and **delete** with `confirm()` guards and toast feedback.

### Fixes rolled in

- Recruiter decision notification now uses `type` column (was `kind`), aligning with Run-03 schema and the escalation-guard RLS added in the security pass.

## Files touched

- DB migration: `UNIQUE (source, external_id)`, `pg_cron` schedule, `log_admin_action` RPC, `audit_log` insert path.
- `src/lib/admin.functions.ts` (new)
- `src/lib/scrape.functions.ts` (+updateJobSource, +deleteJobSource)
- `src/lib/recruiter.functions.ts` (kind→type)
- `src/routes/_authenticated/admin.index.tsx` (new)
- `src/routes/_authenticated/admin.users.tsx` (new)
- `src/routes/_authenticated/admin.jobs.tsx` (new)
- `src/routes/_authenticated/admin.blog.tsx` (new)
- `src/routes/_authenticated/admin.subscriptions.tsx` (new)
- `src/routes/_authenticated/admin.audit.tsx` (new)
- `src/routes/_authenticated/admin.scraping.tsx` (edit/delete + schedule banner)
- `src/components/app-shell.tsx` (Admin console entry)

## Deferred to Run 06

- Stripe checkout for self-serve subscriptions (admin grant works today).
- Public `/blog` reader route (posts publish successfully; reader lands in polish run).
- Heatmaps, product tours, SEO polish.
