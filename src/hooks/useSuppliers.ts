import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Supplier {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  contact_person: string | null;
  payment_terms: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  contact_person?: string;
  payment_terms?: string;
  notes?: string;
}

export type SuppliersQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "name" | "date";
};

export const useSuppliers = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState<SuppliersQuery>({
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: "name",
  });
  const { toast } = useToast();

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error";

  const fetchSuppliers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;

      let request = supabase
        .from("suppliers")
        .select("*", { count: "exact" });

      if (query.search) {
        const search = `%${query.search}%`;
        request = request.or(`name.ilike.${search},email.ilike.${search},phone.ilike.${search}`);
      }

      switch (query.sortBy) {
        case "date":
          request = request.order("created_at", { ascending: false });
          break;
        case "name":
        default:
          request = request.order("name", { ascending: true });
          break;
      }

      const { data, error: queryError, count } = await request.range(from, to);

      if (queryError) throw queryError;

      setSuppliers(data || []);
      setTotalCount(count || 0);
    } catch (err: unknown) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const fetchRef = useRef(fetchSuppliers);

  useEffect(() => {
    fetchRef.current = fetchSuppliers;
  }, [fetchSuppliers]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    // Subscribe to changes
    const channel = supabase
      .channel("suppliers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        () => {
          fetchRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addSupplier = async (data: CreateSupplierData) => {
    try {
      const { error } = await supabase.from("suppliers").insert([data]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Supplier created successfully",
      });
      fetchRef.current();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const updateSupplier = async (id: string, data: Partial<CreateSupplierData>) => {
    try {
      const { error } = await supabase
        .from("suppliers")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Supplier updated successfully",
      });
      fetchRef.current();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const deleteSupplier = async (id: string) => {
    try {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Supplier deleted successfully",
      });
      fetchRef.current();
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  return {
    suppliers,
    totalCount,
    loading,
    query,
    setQuery,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  };
};
