import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  type: "cash_in" | "cash_out";
  category: string;
  description: string;
  amount: number;
  timestamp: Date;
  reconciliation_id?: string;
}

export interface DailyReconciliation {
  id: string;
  date: string;
  opening_balance: number;
  total_cash_in: number;
  total_cash_out: number;
  expected_balance: number;
  actual_cash: number | null;
  variance: number | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useReconciliation() {
  const [reconciliation, setReconciliation] = useState<DailyReconciliation | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  const today = format(new Date(), "yyyy-MM-dd");

  // Load or create today's reconciliation
  useEffect(() => {
    loadTodayReconciliation();
  }, []);

  const loadTodayReconciliation = async () => {
    setLoading(true);
    try {
      // Check if today's reconciliation exists
      const { data: existing, error: fetchError } = await supabase
        .from("daily_reconciliations")
        .select("*")
        .eq("date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) {
        setReconciliation(existing);
        await loadTransactions(existing.id);
      } else {
        // Create new reconciliation for today
        const { data: newRec, error: createError } = await supabase
          .from("daily_reconciliations")
          .insert({ date: today })
          .select()
          .single();

        if (createError) throw createError;
        setReconciliation(newRec);
      }
    } catch (error) {
      console.error("Error loading reconciliation:", error);
      toast.error("Failed to load reconciliation data");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (reconciliationId: string) => {
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("reconciliation_id", reconciliationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map((t) => ({
        id: t.id,
        type: t.type as "cash_in" | "cash_out",
        category: t.category,
        description: t.description || "",
        amount: Number(t.amount),
        timestamp: new Date(t.created_at),
        reconciliation_id: t.reconciliation_id,
      }));
      setTransactions(mapped);
    } catch (error) {
      console.error("Error loading transactions:", error);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, "id" | "timestamp">) => {
    if (!reconciliation) return;

    try {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          reconciliation_id: reconciliation.id,
          type: transaction.type,
          category: transaction.category,
          description: transaction.description || null,
          amount: transaction.amount,
        })
        .select()
        .single();

      if (error) throw error;

      const newTransaction: Transaction = {
        id: data.id,
        type: data.type as "cash_in" | "cash_out",
        category: data.category,
        description: data.description || "",
        amount: Number(data.amount),
        timestamp: new Date(data.created_at),
        reconciliation_id: data.reconciliation_id,
      };

      setTransactions((prev) => [newTransaction, ...prev]);
      await updateReconciliationTotals();
      toast.success("Transaction added");
    } catch (error) {
      console.error("Error adding transaction:", error);
      toast.error("Failed to add transaction");
    }
  };

  const deleteTransaction = async (id: string) => {
    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setTransactions((prev) => prev.filter((t) => t.id !== id));
      await updateReconciliationTotals();
      toast.success("Transaction deleted");
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    }
  };

  const updateReconciliationTotals = async () => {
    if (!reconciliation) return;

    const currentTransactions = await supabase
      .from("transactions")
      .select("*")
      .eq("reconciliation_id", reconciliation.id);

    const txs = currentTransactions.data || [];
    const cashIn = txs.filter((t) => t.type === "cash_in").reduce((sum, t) => sum + Number(t.amount), 0);
    const cashOut = txs.filter((t) => t.type === "cash_out").reduce((sum, t) => sum + Number(t.amount), 0);
    const expected = reconciliation.opening_balance + cashIn - cashOut;

    const { data, error } = await supabase
      .from("daily_reconciliations")
      .update({
        total_cash_in: cashIn,
        total_cash_out: cashOut,
        expected_balance: expected,
        actual_cash: null,
        variance: null,
        status: "pending",
      })
      .eq("id", reconciliation.id)
      .select()
      .single();

    if (!error && data) {
      setReconciliation(data);
    }
  };

  const updateOpeningBalance = async (amount: number) => {
    if (!reconciliation) return;

    try {
      const expected = amount + reconciliation.total_cash_in - reconciliation.total_cash_out;
      const { data, error } = await supabase
        .from("daily_reconciliations")
        .update({ 
          opening_balance: amount,
          expected_balance: expected,
          actual_cash: null,
          variance: null,
          status: "pending"
        })
        .eq("id", reconciliation.id)
        .select()
        .single();

      if (error) throw error;
      setReconciliation(data);
    } catch (error) {
      console.error("Error updating opening balance:", error);
      toast.error("Failed to update opening balance");
    }
  };

  const reconcile = async (actualCash: number) => {
    if (!reconciliation) return;

    try {
      const variance = actualCash - reconciliation.expected_balance;
      const status = Math.abs(variance) < 0.01 ? "balanced" : variance > 0 ? "over" : "short";

      const { data, error } = await supabase
        .from("daily_reconciliations")
        .update({
          actual_cash: actualCash,
          variance: variance,
          status: status,
        })
        .eq("id", reconciliation.id)
        .select()
        .single();

      if (error) throw error;
      setReconciliation(data);
      toast.success("Reconciliation completed!");
    } catch (error) {
      console.error("Error completing reconciliation:", error);
      toast.error("Failed to complete reconciliation");
    }
  };

  return {
    reconciliation,
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    updateOpeningBalance,
    reconcile,
  };
}
