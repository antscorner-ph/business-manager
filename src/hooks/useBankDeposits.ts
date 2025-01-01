import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BankDeposit {
  id: string;
  deposit_date: string;
  bank_name: string;
  account_number: string | null;
  total_amount: number;
  deposit_slip_number: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface BankDepositItem {
  id: string;
  bank_deposit_id: string;
  source: string;
  reference_date: string | null;
  amount: number;
  notes: string | null;
  created_at: string;
}

export type BankDepositsQuery = {
  page: number;
  pageSize: number;
  search: string;
  sortBy: "date" | "amount";
  status: "all" | "pending" | "confirmed" | "reconciled";
};

export function useBankDeposits() {
  const [deposits, setDeposits] = useState<BankDeposit[]>([]);
  const [depositItems, setDepositItems] = useState<Record<string, BankDepositItem[]>>({});
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState<BankDepositsQuery>({
    page: 1,
    pageSize: 10,
    search: "",
    sortBy: "date",
    status: "all",
  });

  const loadDeposits = useCallback(async () => {
    setLoading(true);
    try {
      const from = (query.page - 1) * query.pageSize;
      const to = from + query.pageSize - 1;

      let request = supabase
        .from("bank_deposits")
        .select("*", { count: "exact" });

      if (query.search) {
        const search = `%${query.search}%`;
        request = request.or(`bank_name.ilike.${search},deposit_slip_number.ilike.${search}`);
      }

      if (query.status !== "all") {
        request = request.eq("status", query.status);
      }

      switch (query.sortBy) {
        case "amount":
          request = request.order("total_amount", { ascending: false });
          break;
        case "date":
        default:
          request = request.order("deposit_date", { ascending: false });
          break;
      }

      const { data, error, count } = await request.range(from, to);

      if (error) throw error;
      setDeposits(data || []);
      setTotalCount(count || 0);

      // Load items for all deposits
      if (data && data.length > 0) {
        await loadAllDepositItems(data.map(d => d.id));
      } else {
        setDepositItems({});
      }
    } catch (error) {
      console.error("Error loading bank deposits:", error);
      toast.error("Failed to load bank deposits");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    loadDeposits();
  }, [loadDeposits]);

  const loadAllDepositItems = async (depositIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from("bank_deposit_items")
        .select("*")
        .in("bank_deposit_id", depositIds)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group items by deposit_id
      const grouped = (data || []).reduce((acc, item) => {
        if (!acc[item.bank_deposit_id]) {
          acc[item.bank_deposit_id] = [];
        }
        acc[item.bank_deposit_id].push(item);
        return acc;
      }, {} as Record<string, BankDepositItem[]>);

      setDepositItems(grouped);
    } catch (error) {
      console.error("Error loading deposit items:", error);
    }
  };

  const addDeposit = async (
    deposit: Omit<BankDeposit, "id" | "total_amount" | "status" | "created_at" | "updated_at">
  ): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from("bank_deposits")
        .insert({
          ...deposit,
          total_amount: 0, // Will be updated when items are added
        })
        .select()
        .single();

      if (error) throw error;

      setDeposits((prev) => [data, ...prev]);
      toast.success("Bank deposit created successfully");
      return data.id;
    } catch (error) {
      console.error("Error adding bank deposit:", error);
      toast.error("Failed to create bank deposit");
      throw error;
    }
  };

  const addDepositItem = async (
    item: Omit<BankDepositItem, "id" | "created_at">
  ) => {
    try {
      const { data, error } = await supabase
        .from("bank_deposit_items")
        .insert(item)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setDepositItems((prev) => ({
        ...prev,
        [item.bank_deposit_id]: [
          ...(prev[item.bank_deposit_id] || []),
          data,
        ],
      }));

      // Reload deposits to get updated totals
      await loadDeposits();
      toast.success("Deposit item added");
    } catch (error) {
      console.error("Error adding deposit item:", error);
      toast.error("Failed to add deposit item");
      throw error;
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("bank_deposits")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      await loadDeposits();
      toast.success("Status updated");
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status");
      throw error;
    }
  };

  return {
    deposits,
    depositItems,
    totalCount,
    query,
    setQuery,
    loading,
    addDeposit,
    addDepositItem,
    updateStatus,
    reload: loadDeposits,
  };
}
