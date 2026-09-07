import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { computeLineTotal, type DraftLineItem } from "@/hooks/usePurchaseOrderItems";

export interface PurchaseOrder {
  id: string;
  date: string;
  voucher_no: string;
  supplier_name: string;
  or_no: string | null;
  total_amount: number;
  partial_payment_notes: string | null;
  payment_status: 'unpaid' | 'partial' | 'paid';
  status: 'pending' | 'approved' | 'cancelled';
  delivered_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  /** Number of structured line items on this PO (derived from purchase_order_items). */
  item_count: number;
}

export interface CreatePurchaseOrderData {
  date: string;
  voucher_no: string;
  supplier_id?: string;
  supplier_name: string;
  or_no?: string;
  total_amount: number;
  partial_payment_notes?: string;
  payment_status?: 'unpaid' | 'partial' | 'paid';
  status?: 'pending' | 'approved' | 'cancelled';
  delivered_date?: string;
  notes?: string;
}

export type PurchaseOrdersQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "date" | "amount" | "supplier";
  paymentStatus: "all" | "unpaid" | "partial" | "paid";
  status: "all" | "pending" | "approved" | "cancelled";
  startDate: string;
  endDate: string;
};

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [kpiPurchaseOrders, setKpiPurchaseOrders] = useState<
    Array<Pick<PurchaseOrder, "total_amount" | "payment_status" | "status" | "date" | "delivered_date" | "supplier_name">>
  >([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [query, setQuery] = useState<PurchaseOrdersQuery>({
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: "date",
    paymentStatus: "all",
    status: "all",
    startDate: "",
    endDate: "",
  });
  const { toast } = useToast();

  const getErrorMessage = (error: unknown) =>
    error instanceof Error ? error.message : "Unknown error";

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;

      let listRequest = supabase
        .from("purchase_orders")
        .select("*, purchase_order_items(count)", { count: "exact" });

      let kpiRequest = supabase
        .from("purchase_orders")
        .select("total_amount,payment_status,status,date,delivered_date,supplier_name");

      if (query.search) {
        const search = `%${query.search}%`;
        const filter = `voucher_no.ilike.${search},supplier_name.ilike.${search}`;
        listRequest = listRequest.or(filter);
        kpiRequest = kpiRequest.or(filter);
      }

      if (query.paymentStatus !== "all") {
        listRequest = listRequest.eq("payment_status", query.paymentStatus);
        kpiRequest = kpiRequest.eq("payment_status", query.paymentStatus);
      }

      if (query.status !== "all") {
        listRequest = listRequest.eq("status", query.status);
        kpiRequest = kpiRequest.eq("status", query.status);
      }

      if (query.startDate) {
        listRequest = listRequest.gte("date", query.startDate);
        kpiRequest = kpiRequest.gte("date", query.startDate);
      }

      if (query.endDate) {
        listRequest = listRequest.lte("date", query.endDate);
        kpiRequest = kpiRequest.lte("date", query.endDate);
      }

      switch (query.sortBy) {
        case "amount":
          listRequest = listRequest.order("total_amount", { ascending: false });
          break;
        case "supplier":
          listRequest = listRequest.order("supplier_name", { ascending: true });
          break;
        case "date":
        default:
          listRequest = listRequest.order("date", { ascending: false });
          break;
      }

      const [listResult, kpiResult] = await Promise.all([
        listRequest.range(from, to),
        kpiRequest,
      ]);

      const { data, error: queryError, count } = listResult;
      const { data: kpiData, error: kpiError } = kpiResult;

      if (queryError) throw queryError;
      if (kpiError) throw kpiError;

      // Supabase returns the embedded count as purchase_order_items: [{ count: n }].
      type Row = Record<string, unknown> & {
        purchase_order_items?: { count: number }[] | null;
      };
      const mapped: PurchaseOrder[] = ((data as Row[]) || []).map((row) => {
        const { purchase_order_items, ...rest } = row;
        return {
          ...(rest as Omit<PurchaseOrder, "item_count">),
          item_count: purchase_order_items?.[0]?.count ?? 0,
        };
      });

      setPurchaseOrders(mapped);
      setKpiPurchaseOrders((kpiData as Array<Pick<PurchaseOrder, "total_amount" | "payment_status" | "status" | "date" | "delivered_date" | "supplier_name">>) || []);
      setTotalCount(count || 0);
    } catch (err: unknown) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const fetchRef = useRef(fetchPurchaseOrders);

  useEffect(() => {
    fetchRef.current = fetchPurchaseOrders;
  }, [fetchPurchaseOrders]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    }
  }, [error, toast]);

  useEffect(() => {
    // Subscribe to changes
    const channel = supabase
      .channel("purchase_orders_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "purchase_orders" },
        () => {
          fetchRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addPurchaseOrder = async (data: CreatePurchaseOrderData) => {
    try {
      const { error } = await supabase.from("purchase_orders").insert([data]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order created successfully",
      });

      await fetchPurchaseOrders();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const updatePurchaseOrder = async (id: string, updates: Partial<PurchaseOrder>) => {
    try {
      const { error } = await supabase
        .from("purchase_orders")
        .update(updates)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order updated successfully",
      });

      await fetchPurchaseOrders();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  const updatePaymentStatus = async (
    id: string,
    payment_status: 'unpaid' | 'partial' | 'paid',
    partial_payment_notes?: string
  ) => {
    return updatePurchaseOrder(id, { payment_status, partial_payment_notes });
  };

  const updateStatus = async (id: string, status: 'pending' | 'approved' | 'cancelled') => {
    return updatePurchaseOrder(id, { status });
  };

  const deletePurchaseOrder = async (id: string) => {
    try {
      const { error } = await supabase
        .from("purchase_orders")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order deleted successfully",
      });

      await fetchPurchaseOrders();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return false;
    }
  };

  /**
   * Create a purchase order together with its structured line items.
   * Line items live in purchase_order_items; the PO header stores only the total.
   * Returns the new purchase order id on success, or null on failure.
   */
  const createPurchaseOrderWithItems = async (
    header: Omit<CreatePurchaseOrderData, "total_amount">,
    lineItems: DraftLineItem[]
  ): Promise<string | null> => {
    try {
      if (lineItems.length === 0) {
        throw new Error("Add at least one product to the purchase order");
      }

      const total_amount = lineItems.reduce(
        (sum, item) => sum + computeLineTotal(item),
        0
      );

      const { data: purchaseOrderId, error } = await (supabase as any).rpc(
        "create_purchase_order_with_items",
        {
          p_header: {
            ...header,
            total_amount,
          },
          p_items: lineItems,
        }
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: "Purchase order generated successfully",
      });

      await fetchPurchaseOrders();
      return purchaseOrderId;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getErrorMessage(error),
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    purchaseOrders,
    kpiPurchaseOrders,
    totalCount,
    query,
    setQuery,
    loading,
    addPurchaseOrder,
    createPurchaseOrderWithItems,
    updatePurchaseOrder,
    updatePaymentStatus,
    updateStatus,
    deletePurchaseOrder,
  };
};
