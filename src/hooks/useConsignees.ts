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

/** Resolves display names for a small set of SKUs without loading the whole catalog. */
export function useProductNames(skus: string[]) {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = [...new Set(skus)].sort().join('\u0001');

  useEffect(() => {
    const unique = key ? key.split('\u0001') : [];
    if (unique.length === 0) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.from('products').select('sku, name').in('sku', unique);
      if (error) {
        console.error('Error fetching product names:', error);
        return;
      }
      if (cancelled) return;
      setNames((prev) => {
        const next = { ...prev };
        (data || []).forEach((p) => {
          next[p.sku] = p.name || p.sku;
        });
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return (sku: string) => names[sku] || sku;
}

export type ProductPickerQuery = {
  page: number;
  pageSize: number;
  search: string;
  category: string; // 'all' or an exact category
  inStockOnly: boolean;
  excludeSkus: string[];
};

/** Server-side paginated, filterable product lookup for the "Add products" picker. */
export function useProductsPage(query: ProductPickerQuery, enabled: boolean) {
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const { page, pageSize, search, category, inStockOnly } = query;
  const excludeKey = [...query.excludeSkus].sort().join('\u0001');

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const from = (page - 1) * pageSize;
        let request = supabase
          .from('products')
          .select('*', { count: 'exact' })
          .order('name', { ascending: true, nullsFirst: false })
          .order('sku', { ascending: true });

        // Commas and parentheses would break the PostgREST or() filter syntax.
        const term = search.trim().replace(/[,()]/g, ' ');
        if (term) {
          const like = `%${term}%`;
          request = request.or(`name.ilike.${like},sku.ilike.${like},category.ilike.${like}`);
        }
        if (category !== 'all') request = request.eq('category', category);
        if (inStockOnly) request = request.gt('qty', 0);
        if (excludeKey) {
          const list = excludeKey
            .split('\u0001')
            .map((s) => `"${s.replace(/"/g, '\\"')}"`)
            .join(',');
          request = request.not('sku', 'in', `(${list})`);
        }

        const { data, error, count } = await request.range(from, from + pageSize - 1);
        if (error) throw error;
        if (cancelled) return;
        setProducts(data || []);
        setTotalCount(count || 0);
      } catch (error) {
        if (!cancelled) console.error('Error fetching products:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, page, pageSize, search, category, inStockOnly, excludeKey]);

  return { products, totalCount, loading };
}

/** Distinct product categories, loaded lazily (only the category column, paged past the 1000-row cap). */
export function useProductCategories(enabled: boolean) {
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!enabled || categories.length > 0) return;
    let cancelled = false;
    (async () => {
      const found = new Set<string>();
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from('products')
          .select('category')
          .not('category', 'is', null)
          .order('sku')
          .range(from, from + pageSize - 1);
        if (error) {
          console.error('Error fetching categories:', error);
          return;
        }
        (data || []).forEach((r) => r.category && found.add(r.category));
        if (!data || data.length < pageSize) break;
      }
      if (!cancelled) setCategories([...found].sort((a, b) => a.localeCompare(b)));
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, categories.length]);

  return categories;
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
