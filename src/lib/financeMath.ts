import { parseISO } from "date-fns";

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
