import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type Consignee = Database['public']['Tables']['consignees']['Row'];
export type ConsignedProduct = Database['public']['Tables']['consignee_products']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];

export function useConsignees() {
  const [consignees, setConsignees] = useState<Consignee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConsignees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consignees')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setConsignees(data || []);
    } catch (error) {
      console.error('Error fetching consignees:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConsignees();
  }, []);

  const addConsignee = async (consignee: Omit<Consignee, 'id' | 'created_at' | 'updated_at'>) => {
    const { data, error } = await supabase
      .from('consignees')
      .insert(consignee)
      .select();
    
    if (error) throw error;
    setConsignees(prev => [...prev, ...(data || [])]);
    return data?.[0];
  };

  return { consignees, loading, fetchConsignees, addConsignee };
}

export function useConsigneeProducts(consigneeId: string) {
  const [consignedProducts, setConsignedProducts] = useState<ConsignedProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consignee_products')
        .select('*')
        .eq('consignee_id', consigneeId)
        .eq('status', 'ACTIVE');
      
      if (error) throw error;
      setConsignedProducts(data || []);
    } catch (error) {
      console.error('Error fetching consigned products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (consigneeId) fetchProducts();
  }, [consigneeId]);

  const addProductToConsignee = async (productSku: string, quantity: number) => {
    const { data, error } = await supabase
      .from('consignee_products')
      .upsert({
        consignee_id: consigneeId,
        product_sku: productSku,
        quantity: quantity,
        status: 'ACTIVE'
      }, { onConflict: 'consignee_id,product_sku' })
      .select();
    
    if (error) throw error;
    setConsignedProducts(prev => {
      const filtered = prev.filter(p => p.product_sku !== productSku);
      return [...filtered, ...(data || [])];
    });
  };

  const removeProduct = async (id: string) => {
    const { error } = await supabase
      .from('consignee_products')
      .update({ status: 'INACTIVE' })
      .eq('id', id);
    
    if (error) throw error;
    setConsignedProducts(prev => prev.filter(p => p.id !== id));
  };

  return { consignedProducts, loading, fetchProducts, addProductToConsignee, removeProduct };
}

export function useProductsCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCatalog = async () => {
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
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  return { products, loading };
}

export function useConsignmentTransactions(consigneeId: string) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('consignment_transactions')
        .select('*, consignment_transaction_items(*, products(*))')
        .eq('consignee_id', consigneeId)
        .order('transaction_date', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (consigneeId) fetchTransactions();
  }, [consigneeId]);

  const recordTransaction = async (type: 'REMITTANCE' | 'RESTOCK', items: { sku: string, qty: number, price: number }[]) => {
    // Use a transaction-like approach: 1. Create transaction, 2. Create items, 3. Update stock
    const { data: tx, error: txError } = await supabase
      .from('consignment_transactions')
      .insert({
        consignee_id: consigneeId,
        type,
        transaction_date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (txError) throw txError;

    const txItems = items.map(item => ({
      transaction_id: tx.id,
      product_sku: item.sku,
      quantity: item.qty,
      unit_price: item.price
    }));

    const { error: itemsError } = await supabase
      .from('consignment_transaction_items')
      .insert(txItems);

    if (itemsError) throw itemsError;

    // Update consigned products quantities
    for (const item of items) {
      const { data: current } = await supabase
        .from('consignee_products')
        .select('quantity')
        .eq('consignee_id', consigneeId)
        .eq('product_sku', item.sku)
        .single();

      const newQty = type === 'REMITTANCE' 
        ? (current?.quantity || 0) - item.qty 
        : (current?.quantity || 0) + item.qty;

      await supabase
        .from('consignee_products')
        .upsert({
          consignee_id: consigneeId,
          product_sku: item.sku,
          quantity: newQty,
          status: 'ACTIVE'
        });
    }

    await fetchTransactions();
    return tx;
  };

  return { transactions, loading, recordTransaction, fetchTransactions };
}
