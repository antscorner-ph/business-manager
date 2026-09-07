import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export type PayableSource = "purchase_order" | "expense";
export type PayableStatus = "unpaid" | "partial";

export interface PayableRecord {
  id: string;
  source: PayableSource;
  date: string;
  reference: string;
  payee: string;
  description: string;
  amount: number;
  status: PayableStatus;
  notes: string | null;
}

export type PayablesQuery = {
  search: string;
  source: "all" | PayableSource;
  status: "all" | PayableStatus;
  sortBy: "date" | "amount";
  startDate: string;
  endDate: string;
};

export function usePayables() {
  const [payables, setPayables] = useState<PayableRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<PayablesQuery>({
    search: "",
    source: "all",
    status: "all",
    sortBy: "date",
    startDate: "",
    endDate: "",
  });

  const loadPayables = useCallback(async () => {
    setLoading(true);
    try {
      let poRequest = supabase
        .from("purchase_orders")
        .select("id,date,voucher_no,supplier_name,total_amount,payment_status,partial_payment_notes")
        .in("payment_status", ["unpaid", "partial"]);

      let expenseRequest = supabase
        .from("expenses")
        .select("id,expense_date,description,category,amount,status,notes")
        .in("status", ["unpaid", "partially_paid"]);

      if (query.startDate) {
        poRequest = poRequest.gte("date", query.startDate);
        expenseRequest = expenseRequest.gte("expense_date", query.startDate);
      }

      if (query.endDate) {
        poRequest = poRequest.lte("date", query.endDate);
        expenseRequest = expenseRequest.lte("expense_date", query.endDate);
      }

      const [poResult, expenseResult] = await Promise.all([poRequest, expenseRequest]);

      if (poResult.error) throw poResult.error;
      if (expenseResult.error) throw expenseResult.error;

      const purchaseOrderRows: PayableRecord[] = (poResult.data || []).map((po) => ({
        id: po.id,
        source: "purchase_order",
        date: po.date,
        reference: po.voucher_no,
        payee: po.supplier_name,
        description: "Purchase order",
        amount: Number(po.total_amount || 0),
        status: po.payment_status === "partial" ? "partial" : "unpaid",
        notes: po.partial_payment_notes,
      }));

      const expenseRows: PayableRecord[] = (expenseResult.data || []).map((expense) => ({
        id: expense.id,
        source: "expense",
        date: expense.expense_date,
        reference: `EXP-${expense.id.slice(0, 8).toUpperCase()}`,
        payee: expense.category || "Operating Expense",
        description: expense.description || "Expense",
        amount: Number(expense.amount || 0),
        status: expense.status === "partially_paid" ? "partial" : "unpaid",
        notes: expense.notes,
      }));

      let rows = [...purchaseOrderRows, ...expenseRows];

      if (query.source !== "all") {
        rows = rows.filter((item) => item.source === query.source);
      }

      if (query.status !== "all") {
        rows = rows.filter((item) => item.status === query.status);
      }

      const term = query.search.trim().toLowerCase();
      if (term) {
        rows = rows.filter((item) => {
          const haystack = [item.reference, item.payee, item.description, item.notes || ""]
            .join(" ")
            .toLowerCase();
          return haystack.includes(term);
        });
      }

      rows.sort((a, b) => {
        if (query.sortBy === "amount") return b.amount - a.amount;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      setPayables(rows);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load payables",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadPayables();
  }, [loadPayables]);

  return {
    payables,
    query,
    setQuery,
    loading,
    reload: loadPayables,
  };
}
