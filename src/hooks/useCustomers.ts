import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  contact_person: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerData {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postal_code?: string;
  contact_person?: string;
  notes?: string;
}

export type CustomersQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "name" | "date";
};

export const useCustomers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState<CustomersQuery>({
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: "name",
  });
  const { toast } = useToast();

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error";

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;

      let request = supabase
        .from("customers")
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

      setCustomers(data || []);
      setTotalCount(count || 0);
    } catch (err: unknown) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const fetchRef = useRef(fetchCustomers);

  useEffect(() => {
    fetchRef.current = fetchCustomers;
  }, [fetchCustomers]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

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
      .channel("customers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        () => {
          fetchRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addCustomer = async (data: CreateCustomerData) => {
    try {
      const { error } = await supabase.from("customers").insert([data]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer created successfully",
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

  const updateCustomer = async (id: string, data: Partial<CreateCustomerData>) => {
    try {
      const { error } = await supabase
        .from("customers")
        .update(data)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer updated successfully",
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

  const deleteCustomer = async (id: string) => {
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Customer deleted successfully",
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
    customers,
    totalCount,
    loading,
    query,
    setQuery,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
};
