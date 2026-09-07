import { useCallback, useEffect, useState } from "react";
import { format, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TransactionRow = {
  created_at: string;
  type: string;
  category: string;
  amount: number;
};

type ExpenseRow = {
  expense_date: string;
  category: string;
  amount: number;
  status: string;
};

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

const toMonthKey = (dateValue: string) => format(new Date(dateValue), "yyyy-MM");

const makeRow = (
  label: string,
  monthKeys: string[],
  rowType: "data" | "section" = "data"
): ProfitLossRow => ({
  label,
  rowType,
  values: monthKeys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<string, number>),
});

const EXPENSE_LABEL_MAP: Record<string, string> = {
  Salaries: "Salaries and Wages Expense",
  "Store Renovation": "Renovation Expense",
  "Operating Expense": "Operating Expenses",
  Utilities: "Utilities Expense",
  "Rental Expense": "Rent Expense",
  "Inventory Write-Off": "Inventory Write-Down / Write-Off",
  "Office Supply": "Office Supplies Expense",
  Marketing: "Marketing Expense",
  Transportation: "Transportation Expense",
  Other: "Other Expenses",
};

export function useProfitAndLoss() {
  const [monthsToShow, setMonthsToShow] = useState<6 | 12>(6);
  const [report, setReport] = useState<ProfitLossReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfitLoss = useCallback(async () => {
    setLoading(true);

    try {
      const monthStarts = Array.from({ length: monthsToShow }, (_, i) =>
        startOfMonth(subMonths(new Date(), monthsToShow - 1 - i))
      );

      const months = monthStarts.map((monthDate) => ({
        key: format(monthDate, "yyyy-MM"),
        label: format(monthDate, "MMM (yyyy)"),
      }));

      const monthKeys = months.map((m) => m.key);
      const fromDate = format(monthStarts[0], "yyyy-MM-dd");

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

      const transactions = (transactionsResult.data || []) as TransactionRow[];
      const expenses = (expensesResult.data || []) as ExpenseRow[];

      const salesRevenueRow = makeRow("Sales Revenue", monthKeys);
      const otherIncomeRow = makeRow("Other Income", monthKeys);
      const totalRevenue = makeRow("Total Revenue", monthKeys);

      const personnelSection = makeRow("Personnel Expenses", monthKeys, "section");
      const operationsSection = makeRow("Other Operational Expenses", monthKeys, "section");
      const expenseByLabel: Record<string, ProfitLossRow> = {};
      const totalExpenses = makeRow("Total Expenses", monthKeys);
      const netIncome = makeRow("Net Income (Loss)", monthKeys);

      for (const tx of transactions) {
        if (tx.type !== "cash_in") continue;

        const monthKey = toMonthKey(tx.created_at);
        if (!monthKeys.includes(monthKey)) continue;

        const amount = Number(tx.amount || 0);

        if (tx.category === "Sales") {
          salesRevenueRow.values[monthKey] += amount;
        } else {
          otherIncomeRow.values[monthKey] += amount;
        }
      }

      for (const expense of expenses) {
        const monthKey = toMonthKey(expense.expense_date);
        if (!monthKeys.includes(monthKey)) continue;

        const label = EXPENSE_LABEL_MAP[expense.category] || expense.category || "Other Expenses";
        if (!expenseByLabel[label]) {
          expenseByLabel[label] = makeRow(label, monthKeys);
        }

        expenseByLabel[label].values[monthKey] += Number(expense.amount || 0);
      }

      const personnelRows = Object.values(expenseByLabel)
        .filter((row) => row.label === "Salaries and Wages Expense")
        .sort((a, b) => a.label.localeCompare(b.label));

      const operationalRows = Object.values(expenseByLabel)
        .filter((row) => row.label !== "Salaries and Wages Expense")
        .sort((a, b) => a.label.localeCompare(b.label));

      const expenseRows = [personnelSection, ...personnelRows, operationsSection, ...operationalRows];

      for (const monthKey of monthKeys) {
        totalRevenue.values[monthKey] =
          salesRevenueRow.values[monthKey] + otherIncomeRow.values[monthKey];

        totalExpenses.values[monthKey] = expenseRows
          .filter((row) => row.rowType !== "section")
          .reduce((sum, row) => sum + Number(row.values[monthKey] || 0), 0);

        netIncome.values[monthKey] = totalRevenue.values[monthKey] - totalExpenses.values[monthKey];
      }

      setReport({
        months,
        revenueRows: [salesRevenueRow, otherIncomeRow],
        expenseRows,
        totalRevenue,
        totalExpenses,
        netIncome,
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
