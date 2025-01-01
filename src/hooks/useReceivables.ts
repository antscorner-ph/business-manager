import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Receivable {
  id: string;
  customer_name: string;
  description: string | null;
  amount: number;
  date_issued: string;
  due_date: string | null;
  status: string;
  amount_paid: number;
  balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReceivablePayment {
  id: string;
  receivable_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
  created_at: string;
}

export type ReceivablesQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "date" | "balance" | "duedate";
  status: "all" | "pending" | "partially_paid" | "paid" | "written_off";
};

export function useReceivables() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<ReceivablesQuery>({
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: "date",
    status: "all",
  });

  const loadReceivables = useCallback(async () => {
    setLoading(true);
    try {
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;

      let request = supabase
        .from("receivables")
        .select("*", { count: "exact" });

      if (query.search) {
        const search = `%${query.search}%`;
        request = request.ilike("customer_name", search);
      }

      if (query.status !== "all") {
        request = request.eq("status", query.status);
      }

      switch (query.sortBy) {
        case "balance":
          request = request.order("balance", { ascending: false });
          break;
        case "duedate":
          request = request.order("due_date", { ascending: true });
          break;
        case "date":
        default:
          request = request.order("date_issued", { ascending: false });
          break;
      }

      const { data, error, count } = await request.range(from, to);

      if (error) throw error;
      setReceivables(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error loading receivables:", error);
      toast.error("Failed to load receivables");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadReceivables();
  }, [loadReceivables]);

  const addReceivable = async (
    receivable: Omit<Receivable, "id" | "status" | "amount_paid" | "balance" | "created_at" | "updated_at">
  ) => {
    try {
      const { data, error } = await supabase
        .from("receivables")
        .insert({
          ...receivable,
          balance: receivable.amount,
        })
        .select()
        .single();

      if (error) throw error;

      await loadReceivables();
      toast.success("Receivable added successfully");
    } catch (error) {
      console.error("Error adding receivable:", error);
      toast.error("Failed to add receivable");
      throw error;
    }
  };

  const addPayment = async (
    payment: Omit<ReceivablePayment, "id" | "created_at">
  ) => {
    try {
      const { error } = await supabase
        .from("receivable_payments")
        .insert(payment);

      if (error) throw error;

      // Reload receivables to get updated balances
      await loadReceivables();
      toast.success("Payment recorded successfully");
    } catch (error) {
      console.error("Error adding payment:", error);
      toast.error("Failed to record payment");
      throw error;
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("receivables")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      await loadReceivables();
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
      throw error;
    }
  };

  return {
    receivables,
    totalCount,
    query,
    setQuery,
    loading,
    addReceivable,
    addPayment,
    updateStatus,
    reload: loadReceivables,
  };
}
