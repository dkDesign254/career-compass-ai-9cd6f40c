# Run 09 — Scraper expansion + admin preview

## Shipped
- Disabled `LinkedIn Jobs` source (Firecrawl and virtually all scrapers are blocked by LinkedIn).
- Added 10 curated global/KE sources: Remotive, Remote Rocketship, Wellfound, Remote Woman, AI Job Board, FlexJobs, JS Remotely, Toptal, Corporate Staffing Kenya, Safaricom Careers.
- New server fn `testScrapeUrl` (`src/lib/scrape.functions.ts`) — admin-only dry-run of a URL; returns first 10 extracted jobs without touching the DB.
- Admin `/admin/scraping` "Add source" card now has a **Preview URL** button that runs the dry-run and lists the sample titles/companies inline.
- Seeded 24 realistic demo jobs across the new sources so dashboard/jobs feed have real content for review.

## Deferred (from plan)
- Per-source selector overrides column on `job_sources` (not needed until we see repeat failures on specific sites).
- 20 demo users with resumes/ATS runs — deferred; creating auth users from a migration is fragile. Will use the admin UI + real fixtures in Run 11.

## Next
Run 10 — LinkedIn/GitHub OAuth + profile-URL import.