import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Product {
  sku: string;
  name: string | null;
  category: string | null;
  desc: string | null;
  price: number | null;
  qty: number | null;
  image: string | null;
  /** Reorder threshold: synced from Loyverse, defaulting to 10% of qty. */
  low_stock: number | null;
}

export type StockFilter = "all" | "low" | "out";

/**
 * Read-only access to the existing products catalog.
 * Used by the PO generator to search products and read remaining inventory (qty).
 * Debounce the `search` argument at the call site.
 *
 * `stockFilter` narrows results:
 *   - "out": qty <= 0
 *   - "low": qty <= low_stock (reorder list; includes out-of-stock)
 * Low/out filtering compares two columns, which PostgREST can't express directly,
 * so it is applied client-side after fetching a wider window.
 */
export const useProducts = (search: string, stockFilter: StockFilter = "all", limit = 20) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // When filtering by stock, fetch a wider window so the client-side filter
      // still returns a useful number of matches.
      const fetchLimit = stockFilter === "all" ? limit : Math.max(limit * 10, 200);

      let request = supabase
        .from("products")
        .select("sku, name, category, desc, price, qty, image, low_stock")
        .order("name", { ascending: true })
        .limit(fetchLimit);

      const term = search.trim();
      if (term) {
        const like = `%${term}%`;
        request = request.or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like}`);
      }

      // "out" can be pushed to the server (single-column comparison).
      if (stockFilter === "out") {
        request = request.lte("qty", 0);
      }

      const { data, error } = await request;
      if (error) throw error;

      let rows = data || [];
      // "low" needs a column-to-column comparison; apply it client-side.
      if (stockFilter === "low") {
        rows = rows.filter((p) => {
          const qty = p.qty ?? 0;
          const threshold = p.low_stock ?? 0;
          return qty <= threshold;
        });
      }

      setProducts(rows.slice(0, limit));
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [search, stockFilter, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
};
