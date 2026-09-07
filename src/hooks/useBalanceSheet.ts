import { useCallback, useEffect, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { estimateGcashWalletBalance, estimateInventoryAtCostForDate, isGcashLike } from "@/lib/financeMath";

type DailyReconciliationRow = {
  date: string;
  expected_balance: number;
};

type BankDepositRow = {
  id: string;
  deposit_date: string;
  total_amount: number;
  status: string;
};

type BankDepositItemRow = {
  bank_deposit_id: string;
  source: string;
  amount: number;
};

type ReceivableRow = {
  date_issued: string;
  amount: number;
};

type ReceivablePaymentRow = {
  payment_date: string;
  amount: number;
  payment_method: string | null;
};

type PurchaseOrderRow = {
  id: string;
  date: string;
  total_amount: number;
  payment_status: "unpaid" | "partial" | "paid";
  status: "pending" | "approved" | "cancelled";
};

type PurchaseOrderItemRow = {
  purchase_order_id: string;
  product_sku: string | null;
  unit_cost: number;
};

type ExpenseRow = {
  expense_date: string;
  amount: number;
  status: string;
  payment_method: string;
};

type TransactionRow = {
  created_at: string;
  type: string;
  category: string;
  amount: number;
};

type ProductRow = {
  sku: string;
  qty: number | null;
  price: number | null;
};

export type BalanceSheetMonth = {
  key: string;
  label: string;
  endDate: string;
};

export type BalanceSheetRow = {
  label: string;
  values: Record<string, number>;
  rowType?: "data" | "section";
};

export type BalanceSheetReport = {
  months: BalanceSheetMonth[];
  assetRows: BalanceSheetRow[];
  liabilityRows: BalanceSheetRow[];
  equityRows: BalanceSheetRow[];
  totalAssets: BalanceSheetRow;
  totalLiabilities: BalanceSheetRow;
  totalEquity: BalanceSheetRow;
  equationGap: BalanceSheetRow;
  trendSeries: Array<{
    month: string;
    assets: number;
    liabilities: number;
    equity: number;
  }>;
};

const makeRow = (
  label: string,
  monthKeys: string[],
  rowType: "data" | "section" = "data"
): BalanceSheetRow => ({
  label,
  rowType,
  values: monthKeys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<string, number>),
});

const parseDateSafe = (value: string) => parseISO(value);

const sumThroughDate = <T,>(
  rows: T[],
  cutoff: Date,
  getDate: (row: T) => string,
  getAmount: (row: T) => number,
  predicate?: (row: T) => boolean
) =>
  rows.reduce((sum, row) => {
    if (predicate && !predicate(row)) return sum;
    return parseDateSafe(getDate(row)) <= cutoff ? sum + Number(getAmount(row) || 0) : sum;
  }, 0);

export function useBalanceSheet() {
  const [monthsToShow, setMonthsToShow] = useState<6 | 12>(6);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBalanceSheet = useCallback(async () => {
    setLoading(true);

    try {
      const monthStarts = Array.from({ length: monthsToShow }, (_, i) =>
        startOfMonth(subMonths(new Date(), monthsToShow - 1 - i))
      );

      const months = monthStarts.map((monthDate) => ({
        key: format(monthDate, "yyyy-MM"),
        label: format(monthDate, "MMM (yyyy)"),
        endDate: format(endOfMonth(monthDate), "yyyy-MM-dd"),
      }));

      const monthKeys = months.map((m) => m.key);
      const monthEnds = months.map((m) => parseDateSafe(m.endDate));
      const maxEndDate = format(monthEnds[monthEnds.length - 1], "yyyy-MM-dd");

      const [
        reconciliationResult,
        depositsResult,
        depositItemsResult,
        receivablesResult,
        receivablePaymentsResult,
        purchaseOrdersResult,
        purchaseOrderItemsResult,
        expensesResult,
        transactionsResult,
        productsResult,
      ] = await Promise.all([
        supabase
          .from("daily_reconciliations")
          .select("date,expected_balance")
          .lte("date", maxEndDate)
          .order("date", { ascending: true }),
        supabase
          .from("bank_deposits")
          .select("id,deposit_date,total_amount,status")
          .lte("deposit_date", maxEndDate),
        supabase
          .from("bank_deposit_items")
          .select("bank_deposit_id,source,amount"),
        supabase
          .from("receivables")
          .select("date_issued,amount")
          .lte("date_issued", maxEndDate),
        supabase
          .from("receivable_payments")
          .select("payment_date,amount,payment_method")
          .lte("payment_date", maxEndDate),
        supabase
          .from("purchase_orders")
          .select("id,date,total_amount,payment_status,status")
          .lte("date", maxEndDate),
        supabase
          .from("purchase_order_items")
          .select("purchase_order_id,product_sku,unit_cost"),
        supabase
          .from("expenses")
          .select("expense_date,amount,status,payment_method")
          .lte("expense_date", maxEndDate),
        supabase
          .from("transactions")
          .select("created_at,type,category,amount")
          .lte("created_at", `${maxEndDate}T23:59:59`),
        supabase
          .from("products")
          .select("sku,qty,price"),
      ]);

      if (reconciliationResult.error) throw reconciliationResult.error;
      if (depositsResult.error) throw depositsResult.error;
      if (depositItemsResult.error) throw depositItemsResult.error;
      if (receivablesResult.error) throw receivablesResult.error;
      if (receivablePaymentsResult.error) throw receivablePaymentsResult.error;
      if (purchaseOrdersResult.error) throw purchaseOrdersResult.error;
      if (purchaseOrderItemsResult.error) throw purchaseOrderItemsResult.error;
      if (expensesResult.error) throw expensesResult.error;
      if (transactionsResult.error) throw transactionsResult.error;
      if (productsResult.error) throw productsResult.error;

      const reconciliationRows = (reconciliationResult.data || []) as DailyReconciliationRow[];
      const depositRows = (depositsResult.data || []) as BankDepositRow[];
      const depositItemRows = (depositItemsResult.data || []) as BankDepositItemRow[];
      const receivableRows = (receivablesResult.data || []) as ReceivableRow[];
      const receivablePaymentRows = (receivablePaymentsResult.data || []) as ReceivablePaymentRow[];
      const purchaseOrderRows = (purchaseOrdersResult.data || []) as PurchaseOrderRow[];
      const purchaseOrderItemRows = (purchaseOrderItemsResult.data || []) as PurchaseOrderItemRow[];
      const expenseRows = (expensesResult.data || []) as ExpenseRow[];
      const transactionRows = (transactionsResult.data || []) as TransactionRow[];
      const productRows = (productsResult.data || []) as ProductRow[];

      const currentAssetsSection = makeRow("Current Assets", monthKeys, "section");
      const cashOnHandRow = makeRow("Cash on Hand (Physical, Estimated)", monthKeys);
      const gcashWalletRow = makeRow("GCash Wallet (Estimated)", monthKeys);
      const bankDepositsRow = makeRow("Cash in Bank (Deposits Marked Confirmed/Reconciled)", monthKeys);
      const receivablesRow = makeRow("Accounts Receivable", monthKeys);
      const inventoryRow = makeRow("Inventory (Estimated at Cost)", monthKeys);

      const currentLiabilitiesSection = makeRow("Current Liabilities", monthKeys, "section");
      const payablesPoRow = makeRow("Accounts Payable - Purchase Orders", monthKeys);
      const unpaidExpensesRow = makeRow("Accrued/Unpaid Expenses", monthKeys);

      const equitySection = makeRow("Equity", monthKeys, "section");
      const retainedEarningsRow = makeRow("Retained Earnings (Cash-Basis Approximation)", monthKeys);
      const unresolvedEquityRow = makeRow("Unrecorded Equity Adjustments (Not Included In Total Equity)", monthKeys);

      const totalAssets = makeRow("Total Assets", monthKeys);
      const totalLiabilities = makeRow("Total Liabilities", monthKeys);
      const totalEquity = makeRow("Total Equity", monthKeys);
      const equationGap = makeRow("Equation Check (Assets - Liabilities - Equity)", monthKeys);

      const depositById = new Map(depositRows.map((row) => [row.id, row]));

      for (let i = 0; i < monthKeys.length; i++) {
        const monthKey = monthKeys[i];
        const monthEnd = monthEnds[i];

        const latestReconciliation = reconciliationRows
          .filter((row) => parseDateSafe(row.date) <= monthEnd)
          .at(-1);

        const expectedCashPool = Number(latestReconciliation?.expected_balance || 0);

        const gcashFromTransactions = sumThroughDate(
          transactionRows,
          monthEnd,
          (row) => row.created_at,
          (row) => row.amount,
          (row) => row.type === "cash_in" && isGcashLike(row.category)
        );

        const gcashFromReceivables = sumThroughDate(
          receivablePaymentRows,
          monthEnd,
          (row) => row.payment_date,
          (row) => row.amount,
          (row) => isGcashLike(row.payment_method)
        );

        const gcashExpenseOutflows = sumThroughDate(
          expenseRows,
          monthEnd,
          (row) => row.expense_date,
          (row) => row.amount,
          (row) => row.status === "paid" && isGcashLike(row.payment_method)
        );

        const gcashTransfersToBank = depositItemRows.reduce((sum, row) => {
          if (!isGcashLike(row.source)) return sum;

          const parentDeposit = depositById.get(row.bank_deposit_id);
          if (!parentDeposit) return sum;
          if (!(parentDeposit.status === "confirmed" || parentDeposit.status === "reconciled")) return sum;
          if (parseDateSafe(parentDeposit.deposit_date) > monthEnd) return sum;

          return sum + Number(row.amount || 0);
        }, 0);

        gcashWalletRow.values[monthKey] = estimateGcashWalletBalance({
          gcashInflows: gcashFromTransactions + gcashFromReceivables,
          gcashExpenseOutflows,
          gcashTransfersToBank,
        });

        cashOnHandRow.values[monthKey] = Math.max(0, expectedCashPool - gcashWalletRow.values[monthKey]);

        bankDepositsRow.values[monthKey] = sumThroughDate(
          depositRows,
          monthEnd,
          (row) => row.deposit_date,
          (row) => row.total_amount,
          (row) => row.status === "confirmed" || row.status === "reconciled"
        );

        const receivablesIssued = sumThroughDate(
          receivableRows,
          monthEnd,
          (row) => row.date_issued,
          (row) => row.amount
        );

        const receivablesPaid = sumThroughDate(
          receivablePaymentRows,
          monthEnd,
          (row) => row.payment_date,
          (row) => row.amount
        );

        receivablesRow.values[monthKey] = Math.max(0, receivablesIssued - receivablesPaid);
        inventoryRow.values[monthKey] = estimateInventoryAtCostForDate(
          productRows,
          purchaseOrderRows,
          purchaseOrderItemRows,
          monthEnd
        );

        totalAssets.values[monthKey] =
          cashOnHandRow.values[monthKey] +
          gcashWalletRow.values[monthKey] +
          bankDepositsRow.values[monthKey] +
          receivablesRow.values[monthKey] +
          inventoryRow.values[monthKey];

        payablesPoRow.values[monthKey] = sumThroughDate(
          purchaseOrderRows,
          monthEnd,
          (row) => row.date,
          (row) => row.total_amount,
          (row) => row.status !== "cancelled" && row.payment_status !== "paid"
        );

        unpaidExpensesRow.values[monthKey] = sumThroughDate(
          expenseRows,
          monthEnd,
          (row) => row.expense_date,
          (row) => row.amount,
          (row) => row.status !== "paid"
        );

        totalLiabilities.values[monthKey] =
          payablesPoRow.values[monthKey] + unpaidExpensesRow.values[monthKey];

        const revenueCashIn = sumThroughDate(
          transactionRows,
          monthEnd,
          (row) => row.created_at,
          (row) => row.amount,
          (row) => row.type === "cash_in"
        );

        const paidExpenses = sumThroughDate(
          expenseRows,
          monthEnd,
          (row) => row.expense_date,
          (row) => row.amount,
          (row) => row.status === "paid"
        );

        retainedEarningsRow.values[monthKey] = revenueCashIn - paidExpenses;

        // Keep equity independent so the equation check can expose unexplained gaps.
        totalEquity.values[monthKey] = retainedEarningsRow.values[monthKey];

        equationGap.values[monthKey] =
          totalAssets.values[monthKey] - totalLiabilities.values[monthKey] - totalEquity.values[monthKey];

        unresolvedEquityRow.values[monthKey] = equationGap.values[monthKey];
      }

      const trendSeries = months.map((month) => ({
        month: month.label,
        assets: totalAssets.values[month.key] || 0,
        liabilities: totalLiabilities.values[month.key] || 0,
        equity: totalEquity.values[month.key] || 0,
      }));

      setReport({
        months,
        assetRows: [
          currentAssetsSection,
          cashOnHandRow,
          gcashWalletRow,
          bankDepositsRow,
          receivablesRow,
          inventoryRow,
        ],
        liabilityRows: [currentLiabilitiesSection, payablesPoRow, unpaidExpensesRow],
        equityRows: [equitySection, retainedEarningsRow, unresolvedEquityRow],
        totalAssets,
        totalLiabilities,
        totalEquity,
        equationGap,
        trendSeries,
      });
    } catch (error) {
      console.error("Error loading balance sheet:", error);
      toast.error("Failed to load balance sheet");
    } finally {
      setLoading(false);
    }
  }, [monthsToShow]);

  useEffect(() => {
    loadBalanceSheet();
  }, [loadBalanceSheet]);

  return {
    report,
    monthsToShow,
    setMonthsToShow,
    loading,
    reload: loadBalanceSheet,
  };
}
