import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  buildMonthWindow,
  computeProfitAndLoss,
  type PLExpense,
  type PLTransaction,
} from "@/lib/financeMath";

export type ProfitLossMonth = {
  key: string;
  label: string;
};

export type ProfitLossRow = {
  label: string;
  values: Record<string, number>;
  rowType?: "data" | "section";
};

export type ProfitLossReport = {
  months: ProfitLossMonth[];
  revenueRows: ProfitLossRow[];
  expenseRows: ProfitLossRow[];
  totalRevenue: ProfitLossRow;
  totalExpenses: ProfitLossRow;
  netIncome: ProfitLossRow;
};

const toRow = (
  label: string,
  values: Record<string, number>,
  rowType: "data" | "section" = "data"
): ProfitLossRow => ({ label, values, rowType });

export function useProfitAndLoss() {
  const [monthsToShow, setMonthsToShow] = useState<6 | 12>(6);
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfitLoss = useCallback(async () => {
    setLoading(true);

    try {
      const window = buildMonthWindow(monthsToShow);
      const months = window.map((m) => ({ key: m.key, label: m.label }));
      const monthKeys = window.map((m) => m.key);
      const fromDate = `${monthKeys[0]}-01`;

      const [transactionsResult, expensesResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("created_at,type,category,amount")
          .gte("created_at", fromDate),
        supabase
          .from("expenses")
          .select("expense_date,category,amount,status")
          .gte("expense_date", fromDate)
          .eq("status", "paid"),
      ]);

      if (transactionsResult.error) throw transactionsResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const transactions = (transactionsResult.data || []) as PLTransaction[];
      const expenses = (expensesResult.data || []) as PLExpense[];

      const computed = computeProfitAndLoss(monthKeys, transactions, expenses);

      const salesRevenueRow = toRow("Sales Revenue", computed.salesRevenue);
      const otherIncomeRow = toRow("Other Income", computed.otherIncome);

      const personnelSection = toRow(
        "Personnel Expenses",
        monthKeys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {}),
        "section"
      );
      const operationsSection = toRow(
        "Other Operational Expenses",
        monthKeys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {}),
        "section"
      );

      const labelRows = Object.entries(computed.expenseByLabel).map(([label, values]) =>
        toRow(label, values)
      );

      const personnelRows = labelRows
        .filter((row) => row.label === "Salaries and Wages Expense")
        .sort((a, b) => a.label.localeCompare(b.label));
      const operationalRows = labelRows
        .filter((row) => row.label !== "Salaries and Wages Expense")
        .sort((a, b) => a.label.localeCompare(b.label));

      const expenseRows = [personnelSection, ...personnelRows, operationsSection, ...operationalRows];

      setReport({
        months,
        revenueRows: [salesRevenueRow, otherIncomeRow],
        expenseRows,
        totalRevenue: toRow("Total Revenue", computed.totalRevenue),
        totalExpenses: toRow("Total Expenses", computed.totalExpenses),
        netIncome: toRow("Net Income (Loss)", computed.netIncome),
      });
    } catch (error) {
      console.error("Error loading profit and loss:", error);
      toast.error("Failed to load profit and loss");
    } finally {
      setLoading(false);
    }
  }, [monthsToShow]);

  useEffect(() => {
    loadProfitLoss();
  }, [loadProfitLoss]);

  return {
    report,
    monthsToShow,
    setMonthsToShow,
    loading,
    reload: loadProfitLoss,
  };
}
