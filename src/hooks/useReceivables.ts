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
  startDate: string;
  endDate: string;
};

export function useReceivables() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [kpiReceivables, setKpiReceivables] = useState<
    Array<Pick<Receivable, "amount" | "amount_paid" | "balance" | "status" | "due_date" | "customer_name" | "date_issued">>
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<ReceivablesQuery>({
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: "date",
    status: "all",
    startDate: "",
    endDate: "",
  });

  const loadReceivables = useCallback(async () => {
    setLoading(true);
    try {
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;

      let listRequest = supabase
        .from("receivables")
        .select("*", { count: "exact" });

      let kpiRequest = supabase
        .from("receivables")
        .select("amount,amount_paid,balance,status,due_date,customer_name,date_issued");

      if (query.search) {
        const search = `%${query.search}%`;
        listRequest = listRequest.ilike("customer_name", search);
        kpiRequest = kpiRequest.ilike("customer_name", search);
      }

      if (query.status !== "all") {
        listRequest = listRequest.eq("status", query.status);
        kpiRequest = kpiRequest.eq("status", query.status);
      }

      if (query.startDate) {
        listRequest = listRequest.gte("date_issued", query.startDate);
        kpiRequest = kpiRequest.gte("date_issued", query.startDate);
      }

      if (query.endDate) {
        listRequest = listRequest.lte("date_issued", query.endDate);
        kpiRequest = kpiRequest.lte("date_issued", query.endDate);
      }

      switch (query.sortBy) {
        case "balance":
          listRequest = listRequest.order("balance", { ascending: false });
          break;
        case "duedate":
          listRequest = listRequest.order("due_date", { ascending: true });
          break;
        case "date":
        default:
          listRequest = listRequest.order("date_issued", { ascending: false });
          break;
      }

      const [listResult, kpiResult] = await Promise.all([
        listRequest.range(from, to),
        kpiRequest,
      ]);

      const { data, error, count } = listResult;
      const { data: kpiData, error: kpiError } = kpiResult;

      if (error) throw error;
      if (kpiError) throw kpiError;

      setReceivables(data || []);
      setKpiReceivables(kpiData || []);
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
    kpiReceivables,
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
