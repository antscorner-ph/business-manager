-- Schedule the loyverse-sync Edge Function to run automatically every 60 minutes.
--
-- Uses pg_cron to schedule and pg_net to make the HTTP call. Rather than
-- hardcoding secrets, the job reads two values from database settings that you
-- set once (see the comment block below):
--   app.settings.functions_base_url  -> e.g. https://<project-ref>.functions.supabase.co
--   app.settings.service_role_key    -> the project's service-role key (used as Bearer)
--
-- ONE-TIME SETUP (run these once in the SQL editor, replacing the values):
--   alter database postgres set app.settings.functions_base_url = 'https://<project-ref>.functions.supabase.co';
--   alter database postgres set app.settings.service_role_key   = '<service-role-key>';
-- After setting them you may need a new SQL session for current_setting() to see the values.

-- Required extensions (safe if already enabled).
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous schedule with the same name so re-running is idempotent.
DO $$
BEGIN
  PERFORM cron.unschedule('loyverse-sync-hourly');
EXCEPTION WHEN OTHERS THEN
  -- No existing job; ignore.
  NULL;
END;
$$;

-- Schedule: every 60 minutes, POST to the edge function.
-- SYNC_INTERVAL: '0 * * * *' = top of every hour. Adjust the cron expression to change cadence.
SELECT cron.schedule(
  'loyverse-sync-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.functions_base_url', true) || '/loyverse-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
  $$
);
