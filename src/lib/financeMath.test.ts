import { describe, expect, it } from "vitest";
import {
  computeBalanceSheet,
  computeCashFlow,
  computePayableStatus,
  computeProfitAndLoss,
  estimateGcashWalletBalance,
  estimateInventoryAtCostForDate,
  isGcashLike,
  remainingPayableBalance,
  validatePayablePayment,
} from "@/lib/financeMath";
import { endOfMonth, parseISO } from "date-fns";

describe("isGcashLike", () => {
  it("detects gcash keywords", () => {
    expect(isGcashLike("GCash")).toBe(true);
    expect(isGcashLike("payment via g-cash")).toBe(true);
    expect(isGcashLike("e-wallet transfer")).toBe(true);
    expect(isGcashLike("cash")).toBe(false);
  });
});

describe("estimateGcashWalletBalance", () => {
  it("computes wallet balance from inflows and outflows", () => {
    const result = estimateGcashWalletBalance({
      gcashInflows: 10000,
      gcashExpenseOutflows: 2500,
      gcashTransfersToBank: 3000,
    });

    expect(result).toBe(4500);
  });

  it("never returns negative", () => {
    const result = estimateGcashWalletBalance({
      gcashInflows: 100,
      gcashExpenseOutflows: 500,
      gcashTransfersToBank: 300,
    });

    expect(result).toBe(0);
  });
});

describe("estimateInventoryAtCostForDate", () => {
  it("uses latest known non-cancelled unit cost as of month-end", () => {
    const products = [
      { sku: "A", qty: 10 },
      { sku: "B", qty: 5 },
    ];

    const purchaseOrders = [
      { id: "po-1", date: "2026-05-01", status: "approved" },
      { id: "po-2", date: "2026-06-15", status: "approved" },
      { id: "po-3", date: "2026-06-20", status: "cancelled" },
    ];

    const items = [
      { purchase_order_id: "po-1", product_sku: "A", unit_cost: 40 },
      { purchase_order_id: "po-2", product_sku: "A", unit_cost: 45 },
      { purchase_order_id: "po-3", product_sku: "B", unit_cost: 99 },
      { purchase_order_id: "po-1", product_sku: "B", unit_cost: 30 },
    ];

    const value = estimateInventoryAtCostForDate(
      products,
      purchaseOrders,
      items,
      new Date("2026-06-30")
    );

    // A uses latest approved cost 45 -> 10*45 = 450
    // B ignores cancelled po-3 cost, uses po-1 cost 30 -> 5*30 = 150
    expect(value).toBe(600);
  });
});

describe("computeProfitAndLoss", () => {
  const monthKeys = ["2026-05", "2026-06"];

  it("splits cash_in into Sales vs Other Income and ignores cash_out", () => {
    const result = computeProfitAndLoss(
      monthKeys,
      [
        { created_at: "2026-05-10", type: "cash_in", category: "Sales", amount: 1000 },
        { created_at: "2026-05-12", type: "cash_in", category: "Interest", amount: 200 },
        { created_at: "2026-05-15", type: "cash_out", category: "Sales", amount: 999 },
        { created_at: "2026-06-01", type: "cash_in", category: "Sales", amount: 500 },
      ],
      []
    );

    expect(result.salesRevenue["2026-05"]).toBe(1000);
    expect(result.otherIncome["2026-05"]).toBe(200);
    expect(result.totalRevenue["2026-05"]).toBe(1200);
    expect(result.salesRevenue["2026-06"]).toBe(500);
  });

  it("only counts paid expenses and relabels categories", () => {
    const result = computeProfitAndLoss(
      monthKeys,
      [{ created_at: "2026-05-10", type: "cash_in", category: "Sales", amount: 1000 }],
      [
        { expense_date: "2026-05-05", category: "Salaries", amount: 300, status: "paid" },
        { expense_date: "2026-05-06", category: "Utilities", amount: 100, status: "unpaid" },
        { expense_date: "2026-05-07", category: "Marketing", amount: 50, status: "paid" },
      ]
    );

    expect(result.expenseByLabel["Salaries and Wages Expense"]["2026-05"]).toBe(300);
    expect(result.expenseByLabel["Marketing Expense"]["2026-05"]).toBe(50);
    expect(result.expenseByLabel["Utilities Expense"]).toBeUndefined(); // unpaid excluded
    expect(result.totalExpenses["2026-05"]).toBe(350);
    expect(result.netIncome["2026-05"]).toBe(650);
  });

  it("ignores transactions outside the month window", () => {
    const result = computeProfitAndLoss(
      monthKeys,
      [{ created_at: "2026-01-10", type: "cash_in", category: "Sales", amount: 9999 }],
      []
    );
    expect(result.totalRevenue["2026-05"]).toBe(0);
    expect(result.totalRevenue["2026-06"]).toBe(0);
  });
});

describe("computeCashFlow", () => {
  const monthKeys = ["2026-05", "2026-06"];
  const reconciliations = [
    { date: "2026-05-01", opening_balance: 5000, total_cash_in: 1000, total_cash_out: 200 },
    { date: "2026-05-15", opening_balance: 5800, total_cash_in: 1500, total_cash_out: 300 },
    { date: "2026-06-01", opening_balance: 7000, total_cash_in: 2000, total_cash_out: 400 },
  ];
  const expenses = [
    { expense_date: "2026-05-10", category: "Rent", amount: 800, status: "paid" },
    { expense_date: "2026-05-20", category: "Supplies", amount: 200, status: "paid" },
    { expense_date: "2026-05-21", category: "Supplies", amount: 999, status: "unpaid" },
  ];

  it("expenses_only: outflow is paid expenses, opening is earliest in month", () => {
    const r = computeCashFlow(monthKeys, reconciliations, expenses, "expenses_only");
    expect(r.totalInflow["2026-05"]).toBe(2500); // 1000 + 1500
    expect(r.openingBalance["2026-05"]).toBe(5000); // earliest date's opening
    expect(r.totalOutflow["2026-05"]).toBe(1000); // 800 + 200 (unpaid excluded)
    expect(r.netFlow["2026-05"]).toBe(1500);
    expect(r.endingBalance["2026-05"]).toBe(6500); // 5000 + 1500
  });

  it("daily_cash_out_only: outflow is reconciliation cash_out", () => {
    const r = computeCashFlow(monthKeys, reconciliations, expenses, "daily_cash_out_only");
    expect(r.totalOutflow["2026-05"]).toBe(500); // 200 + 300
    expect(r.netFlow["2026-05"]).toBe(2000); // 2500 - 500
  });

  it("combined: outflow is expenses + daily cash out", () => {
    const r = computeCashFlow(monthKeys, reconciliations, expenses, "combined");
    expect(r.totalOutflow["2026-05"]).toBe(1500); // 1000 + 500
    expect(r.netFlow["2026-05"]).toBe(1000);
  });
});

describe("computeBalanceSheet", () => {
  const monthKeys = ["2026-05", "2026-06"];
  const monthEnds = [endOfMonth(parseISO("2026-05-01")), endOfMonth(parseISO("2026-06-01"))];

  const baseData = {
    reconciliations: [
      { date: "2026-05-31", expected_balance: 5000 },
      { date: "2026-06-30", expected_balance: 6000 },
    ],
    deposits: [
      { id: "d1", deposit_date: "2026-05-10", total_amount: 2000, status: "confirmed" },
      { id: "d2", deposit_date: "2026-05-20", total_amount: 1000, status: "pending" },
    ],
    depositItems: [] as { bank_deposit_id: string; source: string; amount: number }[],
    receivables: [{ date_issued: "2026-05-05", amount: 1500 }],
    receivablePayments: [{ payment_date: "2026-05-25", amount: 500, payment_method: "cash" }],
    purchaseOrders: [
      {
        id: "po1",
        date: "2026-05-02",
        total_amount: 1200,
        payment_status: "unpaid" as const,
        status: "approved" as const,
      },
    ],
    purchaseOrderItems: [{ purchase_order_id: "po1", product_sku: "A", unit_cost: 10 }],
    expenses: [
      { expense_date: "2026-05-08", amount: 400, status: "paid", payment_method: "cash" },
      { expense_date: "2026-05-09", amount: 300, status: "unpaid", payment_method: "cash" },
    ],
    transactions: [
      { created_at: "2026-05-03", type: "cash_in", category: "Sales", amount: 3000 },
      { created_at: "2026-05-04", type: "cash_out", category: "Sales", amount: 111 },
    ],
    products: [{ sku: "A", qty: 5, price: 20 }],
  };

  it("computes cumulative assets, liabilities and equity at month end", () => {
    const r = computeBalanceSheet(monthKeys, monthEnds, baseData);

    // Assets
    expect(r.bankDeposits["2026-05"]).toBe(2000); // only confirmed deposit
    expect(r.receivables["2026-05"]).toBe(1000); // 1500 issued - 500 paid
    expect(r.inventory["2026-05"]).toBe(50); // 5 qty * 10 unit cost
    // no gcash activity -> wallet 0, cash on hand = expected pool
    expect(r.gcashWallet["2026-05"]).toBe(0);
    expect(r.cashOnHand["2026-05"]).toBe(5000);
    expect(r.totalAssets["2026-05"]).toBe(5000 + 0 + 2000 + 1000 + 50);

    // Liabilities
    expect(r.payablesPo["2026-05"]).toBe(1200); // unpaid, non-cancelled PO
    expect(r.unpaidExpenses["2026-05"]).toBe(300);
    expect(r.totalLiabilities["2026-05"]).toBe(1500);

    // Equity = cash-basis retained earnings = cash_in - paid expenses
    expect(r.retainedEarnings["2026-05"]).toBe(3000 - 400);
    expect(r.totalEquity["2026-05"]).toBe(2600);
  });

  it("routes gcash deposit items out of the wallet only when confirmed", () => {
    const data = {
      ...baseData,
      transactions: [{ created_at: "2026-05-03", type: "cash_in", category: "GCash Sales", amount: 1000 }],
      depositItems: [{ bank_deposit_id: "d1", source: "GCash", amount: 400 }],
    };
    const r = computeBalanceSheet(monthKeys, monthEnds, data);
    // 1000 gcash in - 400 transferred to confirmed bank deposit = 600 wallet
    expect(r.gcashWallet["2026-05"]).toBe(600);
  });
});

describe("financial report reconciliation audit", () => {
  // One shared dataset feeding all three reports for a single month.
  const monthKeys = ["2026-05"];
  const monthEnds = [endOfMonth(parseISO("2026-05-01"))];

  const transactions = [
    { created_at: "2026-05-03", type: "cash_in" as const, category: "Sales", amount: 3000 },
    { created_at: "2026-05-10", type: "cash_in" as const, category: "Interest", amount: 200 },
  ];
  const paidExpenses = [
    { expense_date: "2026-05-05", category: "Rent", amount: 800, status: "paid" },
    { expense_date: "2026-05-06", category: "Supplies", amount: 400, status: "paid" },
  ];

  it("P&L net income equals balance-sheet retained earnings (single month, cash basis)", () => {
    const pl = computeProfitAndLoss(
      monthKeys,
      transactions,
      paidExpenses.map((e) => ({ ...e, category: e.category })) as never
    );

    const bs = computeBalanceSheet(monthKeys, monthEnds, {
      reconciliations: [{ date: "2026-05-31", expected_balance: 1800 }],
      deposits: [],
      depositItems: [],
      receivables: [],
      receivablePayments: [],
      purchaseOrders: [],
      purchaseOrderItems: [],
      expenses: paidExpenses.map((e) => ({
        expense_date: e.expense_date,
        amount: e.amount,
        status: e.status,
        payment_method: "cash",
      })),
      transactions,
      products: [],
    });

    // Both are cash-basis: revenue cash_in (3200) - paid expenses (1200) = 2000
    expect(pl.netIncome["2026-05"]).toBe(2000);
    expect(bs.retainedEarnings["2026-05"]).toBe(2000);
    expect(pl.netIncome["2026-05"]).toBe(bs.retainedEarnings["2026-05"]);
  });

  it("cash flow net (daily_cash_out mode) ties opening to ending balance", () => {
    const cf = computeCashFlow(
      monthKeys,
      [{ date: "2026-05-01", opening_balance: 1000, total_cash_in: 3200, total_cash_out: 1200 }],
      paidExpenses,
      "daily_cash_out_only"
    );
    expect(cf.netFlow["2026-05"]).toBe(2000);
    expect(cf.endingBalance["2026-05"]).toBe(cf.openingBalance["2026-05"] + cf.netFlow["2026-05"]);
    expect(cf.endingBalance["2026-05"]).toBe(3000);
  });

  it("documents that accrual liabilities are NOT reflected in cash-basis equity (known gap)", () => {
    // Add an unpaid expense: it is a liability on the balance sheet but does not
    // reduce cash-basis retained earnings or P&L net income. This asserts the
    // intentional cash-basis behavior so a future change is caught.
    const withUnpaid = [
      ...paidExpenses.map((e) => ({ ...e })),
      { expense_date: "2026-05-20", category: "Rent", amount: 500, status: "unpaid" },
    ];

    const pl = computeProfitAndLoss(monthKeys, transactions, withUnpaid as never);
    const bs = computeBalanceSheet(monthKeys, monthEnds, {
      reconciliations: [],
      deposits: [],
      depositItems: [],
      receivables: [],
      receivablePayments: [],
      purchaseOrders: [],
      purchaseOrderItems: [],
      expenses: withUnpaid.map((e) => ({
        expense_date: e.expense_date,
        amount: e.amount,
        status: e.status,
        payment_method: "cash",
      })),
      transactions,
      products: [],
    });

    // Net income unchanged by unpaid expense (cash basis).
    expect(pl.netIncome["2026-05"]).toBe(2000);
    expect(bs.retainedEarnings["2026-05"]).toBe(2000);
    // But the unpaid expense shows up as a liability.
    expect(bs.unpaidExpenses["2026-05"]).toBe(500);
    // Equation gap therefore reflects assets vs (liabilities + equity).
    // assets = cashOnHand(0, no reconciliation) ... equity 2000, liabilities 500
    // gap = 0 - 500 - 2000 = -2500  -> this is the documented reconciliation gap.
    expect(bs.equationGap["2026-05"]).toBe(
      bs.totalAssets["2026-05"] - bs.totalLiabilities["2026-05"] - bs.totalEquity["2026-05"]
    );
  });
});

describe("computePayableStatus", () => {
  it("returns unpaid when nothing is paid", () => {
    expect(computePayableStatus("purchase_order", 1000, 0)).toBe("unpaid");
    expect(computePayableStatus("expense", 1000, 0)).toBe("unpaid");
  });

  it("uses source-specific partial enum", () => {
    expect(computePayableStatus("purchase_order", 1000, 400)).toBe("partial");
    expect(computePayableStatus("expense", 1000, 400)).toBe("partially_paid");
  });

  it("returns paid when fully or over paid", () => {
    expect(computePayableStatus("purchase_order", 1000, 1000)).toBe("paid");
    expect(computePayableStatus("expense", 1000, 1200)).toBe("paid");
  });

  it("treats a zero-total payable as unpaid, not paid", () => {
    expect(computePayableStatus("purchase_order", 0, 0)).toBe("unpaid");
  });
});

describe("remainingPayableBalance", () => {
  it("computes remaining and never goes negative", () => {
    expect(remainingPayableBalance(1000, 300)).toBe(700);
    expect(remainingPayableBalance(1000, 1000)).toBe(0);
    expect(remainingPayableBalance(1000, 1500)).toBe(0);
  });
});

describe("validatePayablePayment", () => {
  it("rejects non-positive amounts", () => {
    expect(validatePayablePayment({ amount: 0, totalAmount: 1000, totalPaid: 0 })).toEqual({
      ok: false,
      reason: "Payment amount must be greater than zero",
    });
    expect(validatePayablePayment({ amount: -5, totalAmount: 1000, totalPaid: 0 }).ok).toBe(false);
  });

  it("rejects overpayment against the remaining balance", () => {
    const result = validatePayablePayment({ amount: 800, totalAmount: 1000, totalPaid: 300 });
    expect(result).toEqual({ ok: false, reason: "Payment exceeds remaining payable balance" });
  });

  it("accepts a payment that exactly clears the balance", () => {
    expect(validatePayablePayment({ amount: 700, totalAmount: 1000, totalPaid: 300 })).toEqual({
      ok: true,
    });
  });

  it("accepts a valid partial payment", () => {
    expect(validatePayablePayment({ amount: 200, totalAmount: 1000, totalPaid: 300 }).ok).toBe(true);
  });
});
