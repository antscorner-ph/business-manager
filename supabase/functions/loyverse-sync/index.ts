// Supabase Edge Function: loyverse-sync
//
// One-way PULL sync: Loyverse -> this app's `products` table.
// Fetches all items (with variants) and inventory levels from the Loyverse API,
// then upserts rows into `products` keyed by SKU.
//
// Secrets / settings (set with `supabase secrets set ...`):
//   LOYVERSE_TOKEN            - Loyverse personal access token (full account access; keep server-side only)
//   LOG_LEVEL                 - debug | info | warn | error (default: info)
//   SUPABASE_URL              - injected automatically in the Supabase runtime
//   SUPABASE_SERVICE_ROLE_KEY - injected automatically; used to bypass RLS for the upsert
//
// This function only READS from Loyverse. It never writes back to Loyverse,
// so it cannot affect the live POS/inventory. (Push sync is a separate, later phase.)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const LOYVERSE_API = "https://api.loyverse.com/v1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Leveled structured logging -------------------------------------------
type LogLevel = "debug" | "info" | "warn" | "error";
const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const CONFIGURED_LEVEL = ((): LogLevel => {
  const raw = (Deno.env.get("LOG_LEVEL") || "info").toLowerCase();
  return raw in LEVEL_ORDER ? (raw as LogLevel) : "info";
})();

/** Emit a structured JSON log line if the message level meets the configured threshold. */
function log(level: LogLevel, message: string, data: Record<string, unknown> = {}) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[CONFIGURED_LEVEL]) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    fn: "loyverse-sync",
    message,
    ...data,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

interface LoyverseVariant {
  variant_id: string;
  sku: string | null;
  default_price: number | null;
  cost: number | null;
  stores?: {
    store_id: string;
    price: number | null;
    low_stock?: number | null;
  }[];
}

interface LoyverseItem {
  id: string;
  item_name: string | null;
  category_id: string | null;
  image_url: string | null;
  variants: LoyverseVariant[];
}

interface InventoryLevel {
  variant_id: string;
  store_id: string;
  in_stock: number | null;
}

interface LoyverseCategory {
  id: string;
  name: string | null;
}

interface ProductRow {
  sku: string;
  name: string | null;
  category: string | null;
  price: number | null;
  qty: number | null;
  image: string | null;
  low_stock: number | null;
}

/** Fetch all pages of a Loyverse collection endpoint, following the `cursor`. */
async function fetchAll<T>(
  path: string,
  token: string,
  collectionKey: string
): Promise<T[]> {
  const results: T[] = [];
  let cursor: string | undefined;
  let page = 0;

  do {
    const url = new URL(`${LOYVERSE_API}${path}`);
    url.searchParams.set("limit", "250");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      // Rate limited (300 req / 300 s). Back off briefly and retry the same cursor.
      log("warn", "Loyverse rate limited; backing off", { path, page });
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 401) {
        throw new Error(
          "Loyverse rejected the access token (401 Unauthorized). The LOYVERSE_TOKEN secret is invalid, expired, or revoked. " +
            "Generate a new personal access token in Loyverse (Settings → Access tokens) and re-set it: " +
            "supabase secrets set LOYVERSE_TOKEN=<token>"
        );
      }
      if (res.status === 403) {
        throw new Error(
          "Loyverse denied access (403 Forbidden). The token lacks the required permissions (ITEMS_READ, INVENTORY_READ)."
        );
      }
      throw new Error(`Loyverse ${path} failed: ${res.status} ${body}`);
    }

    const json = await res.json();
    const batch = (json[collectionKey] as T[]) || [];
    results.push(...batch);
    cursor = json.cursor;
    page += 1;
    log("debug", "Fetched page", { path, page, batch: batch.length, total: results.length });
  } while (cursor);

  log("debug", "Fetched all pages", { path, pages: page, total: results.length });
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const startedAt = Date.now();
    log("info", "Sync started");

    const token = Deno.env.get("LOYVERSE_TOKEN");
    if (!token) {
      throw new Error(
        "LOYVERSE_TOKEN secret is not set. Run: supabase secrets set LOYVERSE_TOKEN=<token>"
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Pull items (with variants), inventory levels, and categories from Loyverse.
    const [items, inventory, categories] = await Promise.all([
      fetchAll<LoyverseItem>("/items", token, "items"),
      fetchAll<InventoryLevel>("/inventory", token, "inventory_levels"),
      fetchAll<LoyverseCategory>("/categories", token, "categories"),
    ]);
    log("info", "Fetched from Loyverse", {
      items: items.length,
      inventory_levels: inventory.length,
      categories: categories.length,
    });

    // Map category id -> readable name so products store the name, not the UUID.
    const categoryNameById = new Map<string, string>();
    for (const category of categories) {
      if (category.name) categoryNameById.set(category.id, category.name);
    }

    // 2. Sum stock per variant across stores (Ant's Corner is effectively one store,
    //    but summing is safe and correct if more are added later).
    const stockByVariant = new Map<string, number>();
    for (const level of inventory) {
      const prev = stockByVariant.get(level.variant_id) ?? 0;
      stockByVariant.set(level.variant_id, prev + (level.in_stock ?? 0));
    }

    // 3. Build product rows keyed by SKU. A Loyverse item can have several variants;
    //    each variant with a SKU becomes a product row.
    const rowsBySku = new Map<string, ProductRow>();
    let skippedNoSku = 0;
    for (const item of items) {
      for (const variant of item.variants || []) {
        const sku = (variant.sku || "").trim();
        if (!sku) {
          skippedNoSku += 1;
          continue; // our products table is keyed by SKU; skip variants without one
        }

        const storePrice = variant.stores?.find((s) => s.price != null)?.price;
        const price = storePrice ?? variant.default_price ?? null;
        const qty = stockByVariant.has(variant.variant_id)
          ? stockByVariant.get(variant.variant_id)!
          : null;

        // Low-stock threshold: prefer Loyverse's per-store value; otherwise
        // default to 10% of the current quantity (rounded).
        const loyverseLowStock = variant.stores?.find((s) => s.low_stock != null)?.low_stock;
        const low_stock =
          loyverseLowStock != null
            ? loyverseLowStock
            : qty != null
            ? Math.round(qty * 0.1)
            : null;

        rowsBySku.set(sku, {
          sku,
          name: item.item_name,
          // Store the readable category name; fall back to the raw id if unmapped.
          category: item.category_id
            ? categoryNameById.get(item.category_id) ?? item.category_id
            : null,
          price,
          qty,
          image: item.image_url,
          low_stock,
        });
      }
    }

    const rows = Array.from(rowsBySku.values());
    log("debug", "Built product rows", { rows: rows.length, skipped_no_sku: skippedNoSku });

    // 4. Upsert in chunks to keep each request small.
    let upserted = 0;
    const chunkSize = 500;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const { error } = await supabase
        .from("products")
        .upsert(chunk, { onConflict: "sku" });
      if (error) throw error;
      upserted += chunk.length;
      log("debug", "Upserted chunk", { from: i, size: chunk.length, upserted });
    }

    const durationMs = Date.now() - startedAt;
    log("info", "Sync complete", {
      items_fetched: items.length,
      inventory_levels_fetched: inventory.length,
      products_upserted: upserted,
      duration_ms: durationMs,
    });

    return new Response(
      JSON.stringify({
        ok: true,
        items_fetched: items.length,
        inventory_levels_fetched: inventory.length,
        products_upserted: upserted,
        duration_ms: durationMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log("error", "Sync failed", { error: message });
    return new Response(
      JSON.stringify({
        ok: false,
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
