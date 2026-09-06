import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface PurchaseOrderItem {
  id: string;
  purchase_order_id: string;
  product_sku: string | null;
  name: string;
  unit: string | null;
  po_in_pcs: number;
  unit_cost: number;
  line_total: number;
  inventory_note: string | null;
  created_at: string;
}

/**
 * A line item being edited in the PO generator before it is saved.
 * `key` is a client-side identifier used for React list rendering only.
 */
export interface DraftLineItem {
  key: string;
  product_sku: string | null;
  name: string;
  unit: string;
  po_in_pcs: number;
  unit_cost: number;
  inventory_note: string;
}

export const computeLineTotal = (item: Pick<DraftLineItem, "po_in_pcs" | "unit_cost">) =>
  Number((item.po_in_pcs * item.unit_cost).toFixed(2));

/**
 * Persist and read structured purchase order line items.
 */
export const usePurchaseOrderItems = () => {
  const getItems = useCallback(
    async (purchaseOrderId: string): Promise<PurchaseOrderItem[]> => {
      const { data, error } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", purchaseOrderId)
        .order("created_at", { ascending: true });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }
      return data || [];
    },
    []
  );

  const insertItems = useCallback(
    async (purchaseOrderId: string, items: DraftLineItem[]) => {
      if (items.length === 0) return true;

      const rows = items.map((item) => ({
        purchase_order_id: purchaseOrderId,
        product_sku: item.product_sku,
        name: item.name,
        unit: item.unit || null,
        po_in_pcs: item.po_in_pcs,
        unit_cost: item.unit_cost,
        line_total: computeLineTotal(item),
        inventory_note: item.inventory_note || null,
      }));

      const { error } = await supabase.from("purchase_order_items").insert(rows);
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }
      return true;
    },
    []
  );

  return { getItems, insertItems };
};
