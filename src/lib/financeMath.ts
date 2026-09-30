import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";

export const isGcashLike = (value: string | null | undefined) => {
  const v = (value || "").toLowerCase();
  return v.includes("gcash") || v.includes("g-cash") || v.includes("ewallet") || v.includes("e-wallet");
};

type ProductQty = {
  sku: string | null;
  qty: number | null;
};

type PurchaseOrderHeader = {
  id: string;
  date: string;
  status: string;
};

type PurchaseOrderItem = {
  purchase_order_id: string;
  product_sku: string | null;
  unit_cost: number;
};

export const estimateInventoryAtCostForDate = (
  products: ProductQty[],
  purchaseOrders: PurchaseOrderHeader[],
  purchaseOrderItems: PurchaseOrderItem[],
  asOfDate: Date
) => {
  const poById = new Map<string, PurchaseOrderHeader>();
  for (const po of purchaseOrders) {
    poById.set(po.id, po);
  }

  const latestCostBySku = new Map<string, { date: string; unitCost: number }>();

  for (const item of purchaseOrderItems) {
    if (!item.product_sku) continue;

    const po = poById.get(item.purchase_order_id);
    if (!po || po.status === "cancelled") continue;

    const poDate = parseISO(po.date);
    if (poDate > asOfDate) continue;

    const existing = latestCostBySku.get(item.product_sku);
    if (!existing || po.date > existing.date) {
      latestCostBySku.set(item.product_sku, {
        date: po.date,
        unitCost: Number(item.unit_cost || 0),
      });
    }
  }

  return products.reduce((sum, product) => {
    if (!product.sku) return sum;
    const qty = Number(product.qty || 0);
    const unitCost = latestCostBySku.get(product.sku)?.unitCost || 0;
    return sum + qty * unitCost;
  }, 0);
};

export const estimateGcashWalletBalance = (params: {
  gcashInflows: number;
  gcashExpenseOutflows: number;
  gcashTransfersToBank: number;
}) => {
  const value =
    Number(params.gcashInflows || 0) -
    Number(params.gcashExpenseOutflows || 0) -
    Number(params.gcashTransfersToBank || 0);

  return Math.max(0, value);
};

// ---------------------------------------------------------------------------
// Shared month window helpers
// ---------------------------------------------------------------------------

export type ReportMonth = {
  key: string;
  label: string;
  endDate: string;
};

/**
 * Builds the trailing month window (oldest -> newest) used by every report.
 * `now` is injectable so the pure functions stay deterministic in tests.
 */
export const buildMonthWindow = (monthsToShow: number, now: Date = new Date()): ReportMonth[] => {
  const monthStarts = Array.from({ length: monthsToShow }, (_, i) =>
    startOfMonth(subMonths(now, monthsToShow - 1 - i))
  );

  return monthStarts.map((monthDate) => ({
    key: format(monthDate, "yyyy-MM"),
    label: format(monthDate, "MMM (yyyy)"),
    endDate: format(endOfMonth(monthDate), "yyyy-MM-dd"),
  }));
};

const zeroValues = (monthKeys: string[]) =>
  monthKeys.reduce((acc, key) => {
    acc[key] = 0;
    return acc;
  }, {} as Record<string, number>);

// ---------------------------------------------------------------------------
// Profit & Loss (cash-basis)
// ---------------------------------------------------------------------------

export type PLTransaction = {
  created_at: string;
  type: string;
  category: string;
  amount: number;
};

export type PLExpense = {
  expense_date: string;
  category: string;
  amount: number;
  status: string;
};

export type ProfitLossResult = {
  monthKeys: string[];
  salesRevenue: Record<string, number>;
  otherIncome: Record<string, number>;
  totalRevenue: Record<string, number>;
  expenseByLabel: Record<string, Record<string, number>>;
  totalExpenses: Record<string, number>;
  netIncome: Record<string, number>;
};

export const EXPENSE_LABEL_MAP: Record<string, string> = {
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

// P&L uses `new Date(...)` for month bucketing (matches original hook).
const plMonthKey = (dateValue: string) => format(new Date(dateValue), "yyyy-MM");

/**
 * Pure cash-basis Profit & Loss aggregation.
 * Only `cash_in` transactions count as revenue; only `paid` expenses count.
 */
export const computeProfitAndLoss = (
  monthKeys: string[],
  transactions: PLTransaction[],
  paidExpenses: PLExpense[]
): ProfitLossResult => {
  const salesRevenue = zeroValues(monthKeys);
  const otherIncome = zeroValues(monthKeys);
  const totalRevenue = zeroValues(monthKeys);
  const totalExpenses = zeroValues(monthKeys);
  const netIncome = zeroValues(monthKeys);
  const expenseByLabel: Record<string, Record<string, number>> = {};

  for (const tx of transactions) {
    if (tx.type !== "cash_in") continue;
    const monthKey = plMonthKey(tx.created_at);
    if (!monthKeys.includes(monthKey)) continue;

    const amount = Number(tx.amount || 0);
    if (tx.category === "Sales") {
      salesRevenue[monthKey] += amount;
    } else {
      otherIncome[monthKey] += amount;
    }
  }

  for (const expense of paidExpenses) {
    if (expense.status !== "paid") continue;
    const monthKey = plMonthKey(expense.expense_date);
    if (!monthKeys.includes(monthKey)) continue;

    const label = EXPENSE_LABEL_MAP[expense.category] || expense.category || "Other Expenses";
    if (!expenseByLabel[label]) expenseByLabel[label] = zeroValues(monthKeys);
    expenseByLabel[label][monthKey] += Number(expense.amount || 0);
  }

  for (const monthKey of monthKeys) {
    totalRevenue[monthKey] = salesRevenue[monthKey] + otherIncome[monthKey];
    totalExpenses[monthKey] = Object.values(expenseByLabel).reduce(
      (sum, row) => sum + Number(row[monthKey] || 0),
      0
    );
    netIncome[monthKey] = totalRevenue[monthKey] - totalExpenses[monthKey];
  }

  return {
    monthKeys,
    salesRevenue,
    otherIncome,
    totalRevenue,
    expenseByLabel,
    totalExpenses,
    netIncome,
  };
};

// ---------------------------------------------------------------------------
// Cash Flow
// ---------------------------------------------------------------------------

export type CashFlowSourceMode = "expenses_only" | "daily_cash_out_only" | "combined";

export type CFReconciliation = {
  date: string;
  opening_balance: number;
  total_cash_in: number;
  total_cash_out: number;
};

export type CFExpense = {
  expense_date: string;
  category: string;
  amount: number;
  status: string;
};

export type CashFlowResult = {
  monthKeys: string[];
  sales: Record<string, number>;
  dailyCashOut: Record<string, number>;
  expenseByCategory: Record<string, Record<string, number>>;
  openingBalance: Record<string, number>;
  totalInflow: Record<string, number>;
  totalOutflow: Record<string, number>;
  netFlow: Record<string, number>;
  endingBalance: Record<string, number>;
};

// CashFlow / BalanceSheet use parseISO for month bucketing (matches originals).
const isoMonthKey = (dateValue: string) => format(parseISO(dateValue), "yyyy-MM");

/**
 * Pure cash flow aggregation. Inflow is daily reconciliation cash-in; outflow
 * depends on `sourceMode`. Opening balance is the earliest reconciliation
 * opening within the month; ending = opening + net.
 */
export const computeCashFlow = (
  monthKeys: string[],
  reconciliations: CFReconciliation[],
  paidExpenses: CFExpense[],
  sourceMode: CashFlowSourceMode
): CashFlowResult => {
  const sales = zeroValues(monthKeys);
  const dailyCashOut = zeroValues(monthKeys);
  const openingBalance = zeroValues(monthKeys);
  const totalInflow = zeroValues(monthKeys);
  const totalOutflow = zeroValues(monthKeys);
  const netFlow = zeroValues(monthKeys);
  const endingBalance = zeroValues(monthKeys);
  const expenseByCategory: Record<string, Record<string, number>> = {};
  const earliestOpeningByMonth: Record<string, { date: string; opening: number }> = {};

  for (const rec of reconciliations) {
    const monthKey = isoMonthKey(rec.date);
    if (!monthKeys.includes(monthKey)) continue;

    sales[monthKey] += Number(rec.total_cash_in || 0);
    dailyCashOut[monthKey] += Number(rec.total_cash_out || 0);

    const existing = earliestOpeningByMonth[monthKey];
    if (!existing || rec.date < existing.date) {
      earliestOpeningByMonth[monthKey] = { date: rec.date, opening: Number(rec.opening_balance || 0) };
    }
  }

  for (const expense of paidExpenses) {
    if (expense.status !== "paid") continue;
    const monthKey = isoMonthKey(expense.expense_date);
    if (!monthKeys.includes(monthKey)) continue;

    const category = expense.category || "Other";
    if (!expenseByCategory[category]) expenseByCategory[category] = zeroValues(monthKeys);
    expenseByCategory[category][monthKey] += Number(expense.amount || 0);
  }

  for (const monthKey of monthKeys) {
    openingBalance[monthKey] = earliestOpeningByMonth[monthKey]?.opening || 0;
    totalInflow[monthKey] = sales[monthKey];

    const expenseOutflow = Object.values(expenseByCategory).reduce(
      (sum, row) => sum + Number(row[monthKey] || 0),
      0
    );

    let selectedOutflow: number;
    if (sourceMode === "expenses_only") {
      selectedOutflow = expenseOutflow;
    } else if (sourceMode === "daily_cash_out_only") {
      selectedOutflow = dailyCashOut[monthKey];
    } else {
      selectedOutflow = expenseOutflow + dailyCashOut[monthKey];
    }

    totalOutflow[monthKey] = selectedOutflow;
    netFlow[monthKey] = totalInflow[monthKey] - totalOutflow[monthKey];
    endingBalance[monthKey] = openingBalance[monthKey] + netFlow[monthKey];
  }

  return {
    monthKeys,
    sales,
    dailyCashOut,
    expenseByCategory,
    openingBalance,
    totalInflow,
    totalOutflow,
    netFlow,
    endingBalance,
  };
};

// ---------------------------------------------------------------------------
// Balance Sheet (cash-basis approximation)
// ---------------------------------------------------------------------------

export type BSReconciliation = { date: string; expected_balance: number };
export type BSDeposit = { id: string; deposit_date: string; total_amount: number; status: string };
export type BSDepositItem = { bank_deposit_id: string; source: string; amount: number };
export type BSReceivable = { date_issued: string; amount: number };
export type BSReceivablePayment = { payment_date: string; amount: number; payment_method: string | null };
export type BSPurchaseOrder = {
  id: string;
  date: string;
  total_amount: number;
  payment_status: "unpaid" | "partial" | "paid";
  status: "pending" | "approved" | "cancelled" | "delivered";
};
export type BSPurchaseOrderItem = { purchase_order_id: string; product_sku: string | null; unit_cost: number };
export type BSExpense = { expense_date: string; amount: number; status: string; payment_method: string };
export type BSTransaction = { created_at: string; type: string; category: string; amount: number };
export type BSProduct = { sku: string; qty: number | null; price: number | null };

export type BalanceSheetResult = {
  monthKeys: string[];
  cashOnHand: Record<string, number>;
  gcashWallet: Record<string, number>;
  bankDeposits: Record<string, number>;
  receivables: Record<string, number>;
  inventory: Record<string, number>;
  payablesPo: Record<string, number>;
  unpaidExpenses: Record<string, number>;
  retainedEarnings: Record<string, number>;
  totalAssets: Record<string, number>;
  totalLiabilities: Record<string, number>;
  totalEquity: Record<string, number>;
  equationGap: Record<string, number>;
};

const sumThroughDate = <T,>(
  rows: T[],
  cutoff: Date,
  getDate: (row: T) => string,
  getAmount: (row: T) => number,
  predicate?: (row: T) => boolean
) =>
  rows.reduce((sum, row) => {
    if (predicate && !predicate(row)) return sum;
    return parseISO(getDate(row)) <= cutoff ? sum + Number(getAmount(row) || 0) : sum;
  }, 0);

/**
 * Pure balance sheet computation. Each month-end is a cumulative snapshot.
 * `monthEnds[i]` must correspond to `monthKeys[i]`.
 */
export const computeBalanceSheet = (
  monthKeys: string[],
  monthEnds: Date[],
  data: {
    reconciliations: BSReconciliation[];
    deposits: BSDeposit[];
    depositItems: BSDepositItem[];
    receivables: BSReceivable[];
    receivablePayments: BSReceivablePayment[];
    purchaseOrders: BSPurchaseOrder[];
    purchaseOrderItems: BSPurchaseOrderItem[];
    expenses: BSExpense[];
    transactions: BSTransaction[];
    products: BSProduct[];
  }
): BalanceSheetResult => {
  const cashOnHand = zeroValues(monthKeys);
  const gcashWallet = zeroValues(monthKeys);
  const bankDeposits = zeroValues(monthKeys);
  const receivables = zeroValues(monthKeys);
  const inventory = zeroValues(monthKeys);
  const payablesPo = zeroValues(monthKeys);
  const unpaidExpenses = zeroValues(monthKeys);
  const retainedEarnings = zeroValues(monthKeys);
  const totalAssets = zeroValues(monthKeys);
  const totalLiabilities = zeroValues(monthKeys);
  const totalEquity = zeroValues(monthKeys);
  const equationGap = zeroValues(monthKeys);

  const depositById = new Map(data.deposits.map((row) => [row.id, row]));

  for (let i = 0; i < monthKeys.length; i++) {
    const monthKey = monthKeys[i];
    const monthEnd = monthEnds[i];

    const latestReconciliation = data.reconciliations
      .filter((row) => parseISO(row.date) <= monthEnd)
      .at(-1);
    const expectedCashPool = Number(latestReconciliation?.expected_balance || 0);

    const gcashFromTransactions = sumThroughDate(
      data.transactions,
      monthEnd,
      (r) => r.created_at,
      (r) => r.amount,
      (r) => r.type === "cash_in" && isGcashLike(r.category)
    );
    const gcashFromReceivables = sumThroughDate(
      data.receivablePayments,
      monthEnd,
      (r) => r.payment_date,
      (r) => r.amount,
      (r) => isGcashLike(r.payment_method)
    );
    const gcashExpenseOutflows = sumThroughDate(
      data.expenses,
      monthEnd,
      (r) => r.expense_date,
      (r) => r.amount,
      (r) => r.status === "paid" && isGcashLike(r.payment_method)
    );
    const gcashTransfersToBank = data.depositItems.reduce((sum, row) => {
      if (!isGcashLike(row.source)) return sum;
      const parent = depositById.get(row.bank_deposit_id);
      if (!parent) return sum;
      if (!(parent.status === "confirmed" || parent.status === "reconciled")) return sum;
      if (parseISO(parent.deposit_date) > monthEnd) return sum;
      return sum + Number(row.amount || 0);
    }, 0);

    gcashWallet[monthKey] = estimateGcashWalletBalance({
      gcashInflows: gcashFromTransactions + gcashFromReceivables,
      gcashExpenseOutflows,
      gcashTransfersToBank,
    });
    cashOnHand[monthKey] = Math.max(0, expectedCashPool - gcashWallet[monthKey]);

    bankDeposits[monthKey] = sumThroughDate(
      data.deposits,
      monthEnd,
      (r) => r.deposit_date,
      (r) => r.total_amount,
      (r) => r.status === "confirmed" || r.status === "reconciled"
    );

    const receivablesIssued = sumThroughDate(
      data.receivables,
      monthEnd,
      (r) => r.date_issued,
      (r) => r.amount
    );
    const receivablesPaid = sumThroughDate(
      data.receivablePayments,
      monthEnd,
      (r) => r.payment_date,
      (r) => r.amount
    );
    receivables[monthKey] = Math.max(0, receivablesIssued - receivablesPaid);

    inventory[monthKey] = estimateInventoryAtCostForDate(
      data.products,
      data.purchaseOrders,
      data.purchaseOrderItems,
      monthEnd
    );

    totalAssets[monthKey] =
      cashOnHand[monthKey] +
      gcashWallet[monthKey] +
      bankDeposits[monthKey] +
      receivables[monthKey] +
      inventory[monthKey];

    payablesPo[monthKey] = sumThroughDate(
      data.purchaseOrders,
      monthEnd,
      (r) => r.date,
      (r) => r.total_amount,
      (r) => r.status !== "cancelled" && r.payment_status !== "paid"
    );
    unpaidExpenses[monthKey] = sumThroughDate(
      data.expenses,
      monthEnd,
      (r) => r.expense_date,
      (r) => r.amount,
      (r) => r.status !== "paid"
    );
    totalLiabilities[monthKey] = payablesPo[monthKey] + unpaidExpenses[monthKey];

    const revenueCashIn = sumThroughDate(
      data.transactions,
      monthEnd,
      (r) => r.created_at,
      (r) => r.amount,
      (r) => r.type === "cash_in"
    );
    const paidExpenses = sumThroughDate(
      data.expenses,
      monthEnd,
      (r) => r.expense_date,
      (r) => r.amount,
      (r) => r.status === "paid"
    );
    retainedEarnings[monthKey] = revenueCashIn - paidExpenses;
    totalEquity[monthKey] = retainedEarnings[monthKey];

    equationGap[monthKey] =
      totalAssets[monthKey] - totalLiabilities[monthKey] - totalEquity[monthKey];
  }

  return {
    monthKeys,
    cashOnHand,
    gcashWallet,
    bankDeposits,
    receivables,
    inventory,
    payablesPo,
    unpaidExpenses,
    retainedEarnings,
    totalAssets,
    totalLiabilities,
    totalEquity,
    equationGap,
  };
};

// ---------------------------------------------------------------------------
// Payable payments (record-payment-from-Payables)
// ---------------------------------------------------------------------------

export type PayableSourceType = "purchase_order" | "expense";

// Status enums differ per source table:
//   purchase_orders.payment_status: 'unpaid' | 'partial' | 'paid'
//   expenses.status:                'unpaid' | 'partially_paid' | 'paid'
export type PurchaseOrderPaymentStatus = "unpaid" | "partial" | "paid";
export type ExpensePaymentStatus = "unpaid" | "partially_paid" | "paid";

/**
 * Pure mirror of the DB write-back trigger. Given the source total and the
 * cumulative amount paid, returns the status the source row should hold.
 * Used by the UI to preview the resulting status before persisting.
 */
export const computePayableStatus = (
  sourceType: PayableSourceType,
  totalAmount: number,
  totalPaid: number
): PurchaseOrderPaymentStatus | ExpensePaymentStatus => {
  const total = Number(totalAmount || 0);
  const paid = Number(totalPaid || 0);

  if (total > 0 && paid >= total) return "paid";
  if (paid > 0) return sourceType === "purchase_order" ? "partial" : "partially_paid";
  return "unpaid";
};

/** Remaining balance on a payable, floored at zero. */
export const remainingPayableBalance = (totalAmount: number, totalPaid: number) =>
  Math.max(0, Number(totalAmount || 0) - Number(totalPaid || 0));

/**
 * Validates a proposed payment against the remaining balance. Mirrors the
 * DB validation trigger so the UI can reject before hitting the network.
 */
export const validatePayablePayment = (params: {
  amount: number;
  totalAmount: number;
  totalPaid: number;
}): { ok: true } | { ok: false; reason: string } => {
  const amount = Number(params.amount);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, reason: "Payment amount must be greater than zero" };
  }

  const remaining = remainingPayableBalance(params.totalAmount, params.totalPaid);
  if (amount > remaining + 1e-9) {
    return { ok: false, reason: "Payment exceeds remaining payable balance" };
  }

  return { ok: true };
};
