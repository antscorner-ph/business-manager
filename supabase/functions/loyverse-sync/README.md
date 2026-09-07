# Loyverse Sync — Setup

One-way pull sync: Loyverse → the app's `products` table. Runs on demand (the
**Sync from Loyverse** button on the Products page) and automatically every hour.

## Components

- `supabase/functions/loyverse-sync/index.ts` — the Edge Function (reads Loyverse, upserts `products`).
- `supabase/migrations/20260906030000_add_products_low_stock.sql` — adds `products.low_stock`.
- `supabase/migrations/20260906040000_schedule_loyverse_sync.sql` — hourly `pg_cron` schedule.

## 1. Apply migrations

Apply all pending migrations to the project the app actually uses
(`VITE_SUPABASE_URL` in `.env`):

```sh
supabase db push
# or paste each migration's SQL into the Supabase SQL editor
```

## 2. Set function secrets

```sh
supabase secrets set LOYVERSE_TOKEN=<loyverse-personal-access-token>
supabase secrets set LOG_LEVEL=info      # debug | info | warn | error (default: info)
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the
Supabase runtime — do not set them manually.

## 3. Deploy the function

```sh
supabase functions deploy loyverse-sync
```

Verify it is reachable (should NOT be 404):

```sh
curl -i -X OPTIONS "https://<project-ref>.functions.supabase.co/loyverse-sync"
```

## 4. Configure the hourly schedule

The cron migration reads two database settings so no secrets are hardcoded. Set
them once (SQL editor), then the hourly job can authenticate:

```sql
alter database postgres set app.settings.functions_base_url = 'https://<project-ref>.functions.supabase.co';
alter database postgres set app.settings.service_role_key   = '<service-role-key>';
```

Cadence is the cron expression in the migration (`0 * * * *` = top of every hour).
Change it there to adjust the interval.

Inspect scheduled jobs / run history:

```sql
select * from cron.job;
select * from cron.job_run_details order by start_time desc limit 10;
```

## 5. Verify a sync

- Click **Sync from Loyverse** on the Products page, or invoke directly:

```sh
curl -X POST "https://<project-ref>.functions.supabase.co/loyverse-sync" \
  -H "Authorization: Bearer <anon-or-service-key>" -H "Content-Type: application/json" -d '{}'
```

Expected JSON: `{ ok: true, items_fetched, inventory_levels_fetched, products_upserted, duration_ms }`.

## Logging

The function emits structured JSON logs gated by `LOG_LEVEL`:

- `info` (default): sync start, fetch summary, completion with counts + duration.
- `debug`: per-page fetches, per-chunk upserts, rows built / skipped (no SKU).
- `warn`: Loyverse rate-limit backoff (HTTP 429).
- `error`: failures.

View them in the Supabase dashboard → Edge Functions → loyverse-sync → Logs.

## Field mapping

| `products` column | Loyverse source |
|---|---|
| `sku` | variant `sku` (variants without a SKU are skipped) |
| `name` | item `item_name` |
| `category` | item `category_id` (UUID — not a readable name) |
| `price` | variant store `price`, else `default_price` |
| `qty` | summed `in_stock` from `/inventory` |
| `low_stock` | variant store `low_stock`, else 10% of `qty` (rounded) |
| `image` | item `image_url` |

Notes:
- The sync only **reads** from Loyverse; it never writes back (POS is never affected).
- Push/dual sync is a separate, later phase.
