import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  buildMonthWindow,
  computeCashFlow,
  type CashFlowSourceMode,
  type CFExpense,
  type CFReconciliation,
} from "@/lib/financeMath";

export type { CashFlowSourceMode };

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

const toRow = (label: string, values: Record<string, number>): CashFlowRow => ({ label, values });

export function useCashFlow() {
  const [monthsToShow, setMonthsToShow] = useState<6 | 12>(6);
  const [sourceMode, setSourceMode] = useState<CashFlowSourceMode>("expenses_only");
  const [report, setReport] = useState<CashFlowReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCashFlow = useCallback(async () => {
    setLoading(true);

    try {
      const window = buildMonthWindow(monthsToShow);
      const months = window.map((m) => ({ key: m.key, label: m.label }));
      const monthKeys = window.map((m) => m.key);
      const fromDate = `${monthKeys[0]}-01`;

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

      const reconciliationRows = (reconciliationResult.data || []) as CFReconciliation[];
      const expenseRows = (expensesResult.data || []) as CFExpense[];

      const computed = computeCashFlow(monthKeys, reconciliationRows, expenseRows, sourceMode);

      const salesRow = toRow("Sales", computed.sales);
      const dailyCashOutRow = toRow("Daily Sales Cash Out", computed.dailyCashOut);

      const expenseCategoryRows = Object.entries(computed.expenseByCategory)
        .map(([label, values]) => toRow(label, values))
        .sort((a, b) => a.label.localeCompare(b.label));

      const outflowRows: CashFlowRow[] = [];
      if (sourceMode === "expenses_only") {
        outflowRows.push(...expenseCategoryRows);
      } else if (sourceMode === "daily_cash_out_only") {
        outflowRows.push(dailyCashOutRow);
      } else {
        outflowRows.push(...expenseCategoryRows, dailyCashOutRow);
      }

      const trendSeries = months.map((month) => ({
        month: month.label,
        opening: computed.openingBalance[month.key] || 0,
        inflow: computed.totalInflow[month.key] || 0,
        outflow: computed.totalOutflow[month.key] || 0,
        net: computed.netFlow[month.key] || 0,
        ending: computed.endingBalance[month.key] || 0,
      }));

      setReport({
        months,
        inflowRows: [salesRow],
        outflowRows,
        openingBalance: toRow("Opening bank balance", computed.openingBalance),
        totalInflow: toRow("Total cash inflow", computed.totalInflow),
        totalOutflow: toRow("Total cash outflow", computed.totalOutflow),
        netFlow: toRow("Cash flow surplus/deficit", computed.netFlow),
        endingBalance: toRow("Ending bank balance", computed.endingBalance),
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
