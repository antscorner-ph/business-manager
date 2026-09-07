import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Product } from "@/hooks/useProducts";

export type ProductsListQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "name" | "qty" | "price";
};

/**
 * Paginated, searchable read-only view of the products catalog.
 * Products are managed in Loyverse and synced into this table; the app only reads them.
 */
export const useProductsList = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<ProductsListQuery>({
    page: 1,
    pageSize: 20,
    search: "",
    sortBy: "name",
  });

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;

      let request = supabase
        .from("products")
        .select("sku, name, category, desc, price, qty, image, low_stock", { count: "exact" });

      if (query.search) {
        const like = `%${query.search}%`;
        request = request.or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like}`);
      }

      switch (query.sortBy) {
        case "qty":
          request = request.order("qty", { ascending: true, nullsFirst: true });
          break;
        case "price":
          request = request.order("price", { ascending: false, nullsFirst: false });
          break;
        case "name":
        default:
          request = request.order("name", { ascending: true, nullsFirst: false });
          break;
      }

      const { data, error, count } = await request.range(from, to);
      if (error) throw error;

      setProducts(data || []);
      setTotalCount(count || 0);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [query]);

  const fetchRef = useRef(fetchProducts);
  useEffect(() => {
    fetchRef.current = fetchProducts;
  }, [fetchProducts]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Refresh when the products table changes (e.g. after a Loyverse sync writes rows).
  useEffect(() => {
    const channel = supabase
      .channel("products_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    products,
    totalCount,
    loading,
    query,
    setQuery,
    refetch: () => fetchRef.current(),
  };
};
