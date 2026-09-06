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
}

/**
 * Read-only access to the existing products catalog.
 * Used by the PO generator to search products and read remaining inventory (qty).
 * Debounce the `search` argument at the call site.
 */
export const useProducts = (search: string, limit = 20) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      let request = supabase
        .from("products")
        .select("sku, name, category, desc, price, qty, image")
        .order("name", { ascending: true })
        .limit(limit);

      const term = search.trim();
      if (term) {
        const like = `%${term}%`;
        request = request.or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like}`);
      }

      const { data, error } = await request;
      if (error) throw error;
      setProducts(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [search, limit]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, refetch: fetchProducts };
};
