import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PurchaseOrder {
  id: string;
  date: string;
  voucher_no: string;
  supplier_name: string;
  or_no: string | null;
  items: string;
  total_amount: number;
  partial_payment_notes: string | null;
  payment_status: 'unpaid' | 'partial' | 'paid';
  status: 'pending' | 'approved' | 'cancelled';
  delivered_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderData {
  date: string;
  voucher_no: string;
  supplier_name: string;
  or_no?: string;
  items: string;
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
};

export const usePurchaseOrders = () => {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
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

      let request = supabase
        .from("purchase_orders")
        .select("*", { count: "exact" });

      if (query.search) {
        const search = `%${query.search}%`;
        request = request.or(`voucher_no.ilike.${search},supplier_name.ilike.${search}`);
      }

      if (query.paymentStatus !== "all") {
        request = request.eq("payment_status", query.paymentStatus);
      }

      if (query.status !== "all") {
        request = request.eq("status", query.status);
      }

      switch (query.sortBy) {
        case "amount":
          request = request.order("total_amount", { ascending: false });
          break;
        case "supplier":
          request = request.order("supplier_name", { ascending: true });
          break;
        case "date":
        default:
          request = request.order("date", { ascending: false });
          break;
      }

      const { data, error: queryError, count } = await request.range(from, to);

      if (queryError) throw queryError;

      setPurchaseOrders(data || []);
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

  return {
    purchaseOrders,
    totalCount,
    query,
    setQuery,
    loading,
    addPurchaseOrder,
    updatePurchaseOrder,
    updatePaymentStatus,
    updateStatus,
    deletePurchaseOrder,
  };
};
