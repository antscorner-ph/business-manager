import { useCallback, useEffect, useState } from "react";
import { parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  buildMonthWindow,
  computeBalanceSheet,
  type BSDeposit,
  type BSDepositItem,
  type BSExpense,
  type BSProduct,
  type BSPurchaseOrder,
  type BSPurchaseOrderItem,
  type BSReceivable,
  type BSReceivablePayment,
  type BSReconciliation,
  type BSTransaction,
} from "@/lib/financeMath";

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

const toRow = (
  label: string,
  values: Record<string, number>,
  rowType: "data" | "section" = "data"
): BalanceSheetRow => ({ label, values, rowType });

const sectionRow = (label: string, monthKeys: string[]): BalanceSheetRow =>
  toRow(
    label,
    monthKeys.reduce((acc, k) => ({ ...acc, [k]: 0 }), {}),
    "section"
  );

export function useBalanceSheet() {
  const [monthsToShow, setMonthsToShow] = useState<6 | 12>(6);
  const [report, setReport] = useState<BalanceSheetReport | null>(null);
  const [loading, setLoading] = useState(true);

  const loadBalanceSheet = useCallback(async () => {
    setLoading(true);

    try {
      const window = buildMonthWindow(monthsToShow);
      const months = window.map((m) => ({ key: m.key, label: m.label, endDate: m.endDate }));
      const monthKeys = months.map((m) => m.key);
      const monthEnds = months.map((m) => parseISO(m.endDate));
      const maxEndDate = months[months.length - 1].endDate;

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
        supabase.from("bank_deposit_items").select("bank_deposit_id,source,amount"),
        supabase.from("receivables").select("date_issued,amount").lte("date_issued", maxEndDate),
        supabase
          .from("receivable_payments")
          .select("payment_date,amount,payment_method")
          .lte("payment_date", maxEndDate),
        supabase
          .from("purchase_orders")
          .select("id,date,total_amount,payment_status,status")
          .lte("date", maxEndDate),
        supabase.from("purchase_order_items").select("purchase_order_id,product_sku,unit_cost"),
        supabase
          .from("expenses")
          .select("expense_date,amount,status,payment_method")
          .lte("expense_date", maxEndDate),
        supabase
          .from("transactions")
          .select("transaction_date,created_at,type,category,amount")
          .lte("transaction_date", maxEndDate),
        supabase.from("products").select("sku,qty,price"),
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

      const computed = computeBalanceSheet(monthKeys, monthEnds, {
        reconciliations: (reconciliationResult.data || []) as BSReconciliation[],
        deposits: (depositsResult.data || []) as BSDeposit[],
        depositItems: (depositItemsResult.data || []) as BSDepositItem[],
        receivables: (receivablesResult.data || []) as BSReceivable[],
        receivablePayments: (receivablePaymentsResult.data || []) as BSReceivablePayment[],
        purchaseOrders: (purchaseOrdersResult.data || []) as BSPurchaseOrder[],
        purchaseOrderItems: (purchaseOrderItemsResult.data || []) as BSPurchaseOrderItem[],
        expenses: (expensesResult.data || []) as BSExpense[],
        transactions: (transactionsResult.data || []) as BSTransaction[],
        products: (productsResult.data || []) as BSProduct[],
      });

      const trendSeries = months.map((month) => ({
        month: month.label,
        assets: computed.totalAssets[month.key] || 0,
        liabilities: computed.totalLiabilities[month.key] || 0,
        equity: computed.totalEquity[month.key] || 0,
      }));

      setReport({
        months,
        assetRows: [
          sectionRow("Current Assets", monthKeys),
          toRow("Cash on Hand (Physical, Estimated)", computed.cashOnHand),
          toRow("GCash Wallet (Estimated)", computed.gcashWallet),
          toRow("Cash in Bank (Deposits Marked Confirmed/Reconciled)", computed.bankDeposits),
          toRow("Accounts Receivable", computed.receivables),
          toRow("Inventory (Estimated at Cost)", computed.inventory),
        ],
        liabilityRows: [
          sectionRow("Current Liabilities", monthKeys),
          toRow("Accounts Payable - Purchase Orders", computed.payablesPo),
          toRow("Accrued/Unpaid Expenses", computed.unpaidExpenses),
        ],
        equityRows: [
          sectionRow("Equity", monthKeys),
          toRow("Retained Earnings (Cash-Basis Approximation)", computed.retainedEarnings),
          toRow("Unrecorded Equity Adjustments (Not Included In Total Equity)", computed.equationGap),
        ],
        totalAssets: toRow("Total Assets", computed.totalAssets),
        totalLiabilities: toRow("Total Liabilities", computed.totalLiabilities),
        totalEquity: toRow("Total Equity", computed.totalEquity),
        equationGap: toRow("Equation Check (Assets - Liabilities - Equity)", computed.equationGap),
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
