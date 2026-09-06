// Supabase Edge Function: loyverse-sync
//
// One-way PULL sync: Loyverse -> this app's `products` table.
// Fetches all items (with variants) and inventory levels from the Loyverse API,
// then upserts rows into `products` keyed by SKU.
//
// Secrets required (set with `supabase secrets set ...`):
//   LOYVERSE_TOKEN          - Loyverse personal access token (full account access; keep server-side only)
//   SUPABASE_URL            - injected automatically in the Supabase runtime
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

interface LoyverseVariant {
  variant_id: string;
  sku: string | null;
  default_price: number | null;
  cost: number | null;
  stores?: { store_id: string; price: number | null }[];
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

interface ProductRow {
  sku: string;
  name: string | null;
  category: string | null;
  price: number | null;
  qty: number | null;
  image: string | null;
}

/** Fetch all pages of a Loyverse collection endpoint, following the `cursor`. */
async function fetchAll<T>(
  path: string,
  token: string,
  collectionKey: string
): Promise<T[]> {
  const results: T[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${LOYVERSE_API}${path}`);
    url.searchParams.set("limit", "250");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 429) {
      // Rate limited (300 req / 300 s). Back off briefly and retry the same cursor.
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Loyverse ${path} failed: ${res.status} ${body}`);
    }

    const json = await res.json();
    const batch = (json[collectionKey] as T[]) || [];
    results.push(...batch);
    cursor = json.cursor;
  } while (cursor);

  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const token = Deno.env.get("LOYVERSE_TOKEN");
    if (!token) {
      throw new Error(
        "LOYVERSE_TOKEN secret is not set. Run: supabase secrets set LOYVERSE_TOKEN=<token>"
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 1. Pull items (with variants) and inventory levels from Loyverse.
    const [items, inventory] = await Promise.all([
      fetchAll<LoyverseItem>("/items", token, "items"),
      fetchAll<InventoryLevel>("/inventory", token, "inventory_levels"),
    ]);

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
    for (const item of items) {
      for (const variant of item.variants || []) {
        const sku = (variant.sku || "").trim();
        if (!sku) continue; // our products table is keyed by SKU; skip variants without one

        const storePrice = variant.stores?.find((s) => s.price != null)?.price;
        const price = storePrice ?? variant.default_price ?? null;
        const qty = stockByVariant.has(variant.variant_id)
          ? stockByVariant.get(variant.variant_id)!
          : null;

        rowsBySku.set(sku, {
          sku,
          name: item.item_name,
          category: item.category_id, // Loyverse returns a category UUID here
          price,
          qty,
          image: item.image_url,
        });
      }
    }

    const rows = Array.from(rowsBySku.values());

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
    }

    return new Response(
      JSON.stringify({
        ok: true,
        items_fetched: items.length,
        inventory_levels_fetched: inventory.length,
        products_upserted: upserted,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
