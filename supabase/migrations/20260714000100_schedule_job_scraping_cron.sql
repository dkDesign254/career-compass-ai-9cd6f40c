SELECT cron.schedule(
  'scrape-jobs-every-12h',
  '0 */12 * * *',
  $$
  SELECT net.http_post(
    url := 'https://career-compass-ai-9cd6f40c.vercel.app/api/public/hooks/scrape-jobs',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'sb_publishable_Ik-QyERs5uR-jPFYR8baAw_YWbBy2AN'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
