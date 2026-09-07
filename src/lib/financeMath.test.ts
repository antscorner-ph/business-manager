import { describe, expect, it } from "vitest";
import { estimateGcashWalletBalance, estimateInventoryAtCostForDate, isGcashLike } from "@/lib/financeMath";

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
