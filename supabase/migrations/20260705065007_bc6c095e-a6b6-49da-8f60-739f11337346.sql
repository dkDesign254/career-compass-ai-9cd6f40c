UPDATE public.job_sources
SET enabled = false,
    last_status = 'unsupported',
    last_error = 'LinkedIn blocks scrapers (Firecrawl unsupported site). Disabled by default; use LinkedIn OAuth on profiles instead.'
WHERE name = 'LinkedIn Jobs';