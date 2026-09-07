import { useCallback, useEffect, useState } from "react";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type DailyReconciliationRow = {
  date: string;
  opening_balance: number;
  total_cash_in: number;
  total_cash_out: number;
};

type ExpenseRow = {
  expense_date: string;
  category: string;
  amount: number;
  status: string;
};

export type CashFlowMonth = {
  key: string;
  label: string;
};

export type CashFlowRow = {
  label: string;
  values: Record<string, number>;
};

export type CashFlowReport = {
  months: CashFlowMonth[];
  inflowRows: CashFlowRow[];
  outflowRows: CashFlowRow[];
  openingBalance: CashFlowRow;
  totalInflow: CashFlowRow;
  totalOutflow: CashFlowRow;
  netFlow: CashFlowRow;
  endingBalance: CashFlowRow;
  trendSeries: Array<{
    month: string;
    opening: number;
    inflow: number;
    outflow: number;
    net: number;
    ending: number;
  }>;
};

export type CashFlowSourceMode = "expenses_only" | "daily_cash_out_only" | "combined";

const toMonthKey = (dateValue: string) => format(parseISO(dateValue), "yyyy-MM");

const makeRow = (label: string, monthKeys: string[]): CashFlowRow => ({
  label,
  values: monthKeys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<string, number>),
});

export function useCashFlow() {
  const [monthsToShow, setMonthsToShow] = useState<6 | 12>(6);
  const [sourceMode, setSourceMode] = useState<CashFlowSourceMode>("expenses_only");
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCashFlow = useCallback(async () => {
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

      const [reconciliationResult, expensesResult] = await Promise.all([
        supabase
          .from("daily_reconciliations")
          .select("date,opening_balance,total_cash_in,total_cash_out")
          .gte("date", fromDate),
        supabase
          .from("expenses")
          .select("expense_date,category,amount,status")
          .gte("expense_date", fromDate)
          .eq("status", "paid"),
      ]);

      if (reconciliationResult.error) throw reconciliationResult.error;
      if (expensesResult.error) throw expensesResult.error;

      const reconciliationRows = (reconciliationResult.data || []) as DailyReconciliationRow[];
      const expenseRows = (expensesResult.data || []) as ExpenseRow[];

      const salesRow = makeRow("Sales", monthKeys);
      const dailyCashOutRow = makeRow("Daily Sales Cash Out", monthKeys);
      const openingBalance = makeRow("Opening bank balance", monthKeys);
      const totalInflow = makeRow("Total cash inflow", monthKeys);
      const totalOutflow = makeRow("Total cash outflow", monthKeys);
      const netFlow = makeRow("Cash flow surplus/deficit", monthKeys);
      const endingBalance = makeRow("Ending bank balance", monthKeys);

      const expenseByCategory: Record<string, CashFlowRow> = {};
      const earliestOpeningByMonth: Record<string, { date: string; opening: number }> = {};

      for (const rec of reconciliationRows) {
        const monthKey = toMonthKey(rec.date);
        if (!monthKeys.includes(monthKey)) continue;

        salesRow.values[monthKey] += Number(rec.total_cash_in || 0);
        dailyCashOutRow.values[monthKey] += Number(rec.total_cash_out || 0);

        const existing = earliestOpeningByMonth[monthKey];
        if (!existing || rec.date < existing.date) {
          earliestOpeningByMonth[monthKey] = {
            date: rec.date,
            opening: Number(rec.opening_balance || 0),
          };
        }
      }

      for (const expense of expenseRows) {
        const monthKey = toMonthKey(expense.expense_date);
        if (!monthKeys.includes(monthKey)) continue;

        const category = expense.category || "Other";
        if (!expenseByCategory[category]) {
          expenseByCategory[category] = makeRow(category, monthKeys);
        }

        expenseByCategory[category].values[monthKey] += Number(expense.amount || 0);
      }

      const outflowRowsByCategory = Object.values(expenseByCategory)
        .sort((a, b) => a.label.localeCompare(b.label));

      const outflowRows: CashFlowRow[] = [];
      if (sourceMode === "expenses_only") {
        outflowRows.push(...outflowRowsByCategory);
      } else if (sourceMode === "daily_cash_out_only") {
        outflowRows.push(dailyCashOutRow);
      } else {
        outflowRows.push(...outflowRowsByCategory, dailyCashOutRow);
      }

      const trendSeries: CashFlowReport["trendSeries"] = [];

      for (const monthKey of monthKeys) {
        openingBalance.values[monthKey] = earliestOpeningByMonth[monthKey]?.opening || 0;
        totalInflow.values[monthKey] = salesRow.values[monthKey];

        const selectedOutflow = outflowRows.reduce(
          (sum, row) => sum + Number(row.values[monthKey] || 0),
          0
        );

        totalOutflow.values[monthKey] = selectedOutflow;
        netFlow.values[monthKey] = totalInflow.values[monthKey] - totalOutflow.values[monthKey];
        endingBalance.values[monthKey] = openingBalance.values[monthKey] + netFlow.values[monthKey];

        const month = months.find((m) => m.key === monthKey);
        trendSeries.push({
          month: month?.label || monthKey,
          opening: openingBalance.values[monthKey],
          inflow: totalInflow.values[monthKey],
          outflow: totalOutflow.values[monthKey],
          net: netFlow.values[monthKey],
          ending: endingBalance.values[monthKey],
        });
      }

      setReport({
        months,
        inflowRows: [salesRow],
        outflowRows,
        openingBalance,
        totalInflow,
        totalOutflow,
        netFlow,
        endingBalance,
        trendSeries,
      });
    } catch (error) {
      console.error("Error loading cash flow:", error);
      toast.error("Failed to load cash flow");
    } finally {
      setLoading(false);
    }
  }, [monthsToShow, sourceMode]);

  useEffect(() => {
    loadCashFlow();
  }, [loadCashFlow]);

  return {
    report,
    monthsToShow,
    setMonthsToShow,
    sourceMode,
    setSourceMode,
    loading,
    reload: loadCashFlow,
  };
}
