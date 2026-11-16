import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Consignee = Database['public']['Tables']['consignees']['Row'];
export type ConsignedProduct = Database['public']['Tables']['consignee_products']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type ConsignmentTransaction = Database['public']['Tables']['consignment_transactions']['Row'];
export type ConsignmentPayment = Database['public']['Tables']['consignment_payments']['Row'];

export type TransactionItemInput = { sku: string; qty: number };

export function useConsignees() {
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConsignees = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consignees')
        .select('*')
        .eq('status', 'ACTIVE')
        .order('name');

      if (error) throw error;
      setConsignees(data || []);
    } catch (error) {
      console.error('Error fetching consignees:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConsignees();
  }, [fetchConsignees]);

  const addConsignee = async (
    consignee: Pick<Consignee, 'name'> &
      Partial<Pick<Consignee, 'contact_person' | 'phone' | 'address' | 'notes' | 'commission_rate'>>
  ) => {
    const { data, error } = await supabase
      .from('consignees')
      .insert(consignee)
      .select()
      .single();

    if (error) throw error;
    setConsignees((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    return data;
  };

  const updateConsignee = async (
    id: string,
    patch: Partial<Pick<Consignee, 'name' | 'contact_person' | 'phone' | 'address' | 'notes' | 'commission_rate'>>
  ) => {
    const { data, error } = await supabase
      .from('consignees')
      .update(patch)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    setConsignees((prev) => prev.map((c) => (c.id === id ? data : c)));
    return data;
  };

  return { consignees, loading, fetchConsignees, addConsignee, updateConsignee };
}

export function useConsigneeProducts(consigneeId: string) {
  const [consignedProducts, setConsignedProducts] = useState<ConsignedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!consigneeId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consignee_products')
        .select('*')
        .eq('consignee_id', consigneeId)
        .eq('status', 'ACTIVE')
        .order('created_at');

      if (error) throw error;
      setConsignedProducts(data || []);
    } catch (error) {
      console.error('Error fetching consigned products:', error);
    } finally {
      setLoading(false);
    }
  }, [consigneeId]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Placing a product (initial stock) goes through the atomic RESTOCK RPC so
  // stock math and price snapshotting stay consistent with every other change.
  const addProductToConsignee = async (productSku: string, quantity: number) => {
    if (quantity <= 0) throw new Error('Quantity must be greater than zero');
    const { error } = await supabase.rpc('record_consignment_transaction', {
      p_header: { consignee_id: consigneeId, type: 'RESTOCK' },
      p_items: [{ product_sku: productSku, quantity }],
    });
    if (error) throw error;
    await fetchProducts();
  };

  const removeProduct = async (id: string) => {
    const { error } = await supabase
      .from('consignee_products')
      .update({ status: 'INACTIVE' })
      .eq('id', id);

    if (error) throw error;
    setConsignedProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return { consignedProducts, loading, fetchProducts, addProductToConsignee, removeProduct };
}

export function useProductsCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching product catalog:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  return { products, loading, fetchCatalog };
}

type TransactionWithItems = ConsignmentTransaction & {
  consignment_transaction_items: (Database['public']['Tables']['consignment_transaction_items']['Row'] & {
    products: Pick<Product, 'sku' | 'name'> | null;
  })[];
  consignment_payments: ConsignmentPayment[];
};

export function useConsignmentTransactions(consigneeId: string) {
  const [transactions, setTransactions] = useState<TransactionWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!consigneeId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consignment_transactions')
        .select(
          '*, consignment_transaction_items(*, products(sku, name)), consignment_payments(*)'
        )
        .eq('consignee_id', consigneeId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data as unknown as TransactionWithItems[]) || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  }, [consigneeId]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Single atomic call: header + items + stock mutation + financials.
  const recordTransaction = async (
    type: 'REMITTANCE' | 'RESTOCK',
    items: TransactionItemInput[]
  ) => {
    const cleanItems = items
      .filter((i) => i.sku && i.qty > 0)
      .map((i) => ({ product_sku: i.sku, quantity: i.qty }));

    if (cleanItems.length === 0) {
      throw new Error('At least one item with a positive quantity is required');
    }

    const { data, error } = await supabase.rpc('record_consignment_transaction', {
      p_header: { consignee_id: consigneeId, type },
      p_items: cleanItems,
    });

    if (error) throw error;
    await fetchTransactions();
    return data;
  };

  const recordPayment = async (
    transactionId: string,
    amount: number,
    paymentMethod = 'cash',
    notes?: string
  ) => {
    if (amount <= 0) throw new Error('Payment amount must be greater than zero');
    const { error } = await supabase.from('consignment_payments').insert({
      transaction_id: transactionId,
      amount,
      payment_method: paymentMethod,
      notes: notes || null,
    });
    if (error) throw error;
    await fetchTransactions();
  };

  // Total still owed to the business across all remittances.
  const outstandingBalance = transactions
    .filter((t) => t.type === 'REMITTANCE')
    .reduce((sum, t) => sum + Number(t.balance), 0);

  return {
    transactions,
    loading,
    recordTransaction,
    recordPayment,
    fetchTransactions,
    outstandingBalance,
  };
}
