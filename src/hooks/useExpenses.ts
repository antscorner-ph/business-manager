import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Expense {
  id: string;
  expense_date: string;
  description: string;
  category: string;
  payment_method: string;
  status: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpensesQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "date" | "amount";
  status: "all" | "paid" | "unpaid" | "partially_paid";
  paymentMethod: "all" | "cash" | "gcash" | "check" | "bank_transfer" | "other";
  category: string;
  startDate: string;
  endDate: string;
};

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [kpiExpenses, setKpiExpenses] = useState<
    Array<Pick<Expense, "amount" | "status" | "expense_date" | "category" | "description" | "payment_method">>
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<ExpensesQuery>({
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: "date",
    status: "all",
    paymentMethod: "all",
    category: "all",
    startDate: "",
    endDate: "",
  });

  const loadExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;

      let listRequest = supabase
        .from("expenses")
        .select("*", { count: "exact" });

      let kpiRequest = supabase
        .from("expenses")
        .select("amount,status,expense_date,category,description,payment_method");

      if (query.search) {
        const search = `%${query.search}%`;
        const filter = `description.ilike.${search},category.ilike.${search},notes.ilike.${search}`;
        listRequest = listRequest.or(filter);
        kpiRequest = kpiRequest.or(filter);
      }

      if (query.status !== "all") {
        listRequest = listRequest.eq("status", query.status);
        kpiRequest = kpiRequest.eq("status", query.status);
      }

      if (query.paymentMethod !== "all") {
        listRequest = listRequest.eq("payment_method", query.paymentMethod);
        kpiRequest = kpiRequest.eq("payment_method", query.paymentMethod);
      }

      if (query.category !== "all") {
        listRequest = listRequest.eq("category", query.category);
        kpiRequest = kpiRequest.eq("category", query.category);
      }

      if (query.startDate) {
        listRequest = listRequest.gte("expense_date", query.startDate);
        kpiRequest = kpiRequest.gte("expense_date", query.startDate);
      }

      if (query.endDate) {
        listRequest = listRequest.lte("expense_date", query.endDate);
        kpiRequest = kpiRequest.lte("expense_date", query.endDate);
      }

      switch (query.sortBy) {
        case "amount":
          listRequest = listRequest.order("amount", { ascending: false });
          break;
        case "date":
        default:
          listRequest = listRequest.order("expense_date", { ascending: false });
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

      setExpenses(data || []);
      setKpiExpenses(kpiData || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error loading expenses:", error);
      toast.error("Failed to load expenses");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const addExpense = async (
    expense: Omit<Expense, "id" | "created_at" | "updated_at">
  ) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .insert(expense);

      if (error) throw error;

      await loadExpenses();
      toast.success("Expense added successfully");
    } catch (error) {
      console.error("Error adding expense:", error);
      toast.error("Failed to add expense");
      throw error;
    }
  };

  const updateExpenseStatus = async (id: string, status: "paid" | "unpaid" | "partially_paid") => {
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      await loadExpenses();
      toast.success("Expense status updated");
    } catch (error) {
      console.error("Error updating expense status:", error);
      toast.error("Failed to update expense status");
      throw error;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from("expenses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      await loadExpenses();
      toast.success("Expense deleted");
    } catch (error) {
      console.error("Error deleting expense:", error);
      toast.error("Failed to delete expense");
      throw error;
    }
  };

  return {
    expenses,
    kpiExpenses,
    totalCount,
    query,
    setQuery,
    loading,
    addExpense,
    updateExpenseStatus,
    deleteExpense,
    reload: loadExpenses,
  };
}
