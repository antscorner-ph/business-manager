import { useCallback, useState } from "react";
import { untypedSupabase } from "@/integrations/supabase/untyped";
import { toast } from "@/hooks/use-toast";
import type { PayableSourceType } from "@/lib/financeMath";

export type PayablePaymentMethod = "cash" | "gcash" | "check" | "bank_transfer" | "other";

export interface PayablePaymentRow {
  id: string;
  source_type: PayableSourceType;
  source_id: string;
  amount: number;
  payment_date: string;
  payment_method: PayablePaymentMethod;
  notes: string | null;
  created_at: string;
}

export interface RecordPayablePaymentInput {
  sourceType: PayableSourceType;
  sourceId: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PayablePaymentMethod;
  notes?: string | null;
}

/**
 * Records payments against a payable (purchase order or expense) and reads the
 * payment history. Writes go through the untyped client because
 * `payable_payments` is not yet in the generated Supabase types. Source-row
 * status is maintained by DB triggers, not here.
 */
export function usePayablePayments() {
  const [saving, setSaving] = useState(false);

  const recordPayment = useCallback(
    async (input: RecordPayablePaymentInput): Promise<boolean> => {
      setSaving(true);
      try {
        const { error } = await untypedSupabase.from("payable_payments").insert([
          {
            source_type: input.sourceType,
            source_id: input.sourceId,
            amount: input.amount,
            payment_date: input.paymentDate,
            payment_method: input.paymentMethod,
            notes: input.notes?.trim() ? input.notes.trim() : null,
          },
        ]);

        if (error) throw error;

        toast({ title: "Payment recorded", description: "The payable has been updated." });
        return true;
      } catch (error: unknown) {
        toast({
          title: "Failed to record payment",
          description: error instanceof Error ? error.message : "Please try again.",
          variant: "destructive",
        });
        return false;
      } finally {
        setSaving(false);
      }
    },
    []
  );

  const fetchPayments = useCallback(
    async (sourceType: PayableSourceType, sourceId: string): Promise<PayablePaymentRow[]> => {
      const { data, error } = await untypedSupabase
        .from("payable_payments")
        .select("id,source_type,source_id,amount,payment_date,payment_method,notes,created_at")
        .eq("source_type", sourceType)
        .eq("source_id", sourceId)
        .order("payment_date", { ascending: false });

      if (error) {
        toast({
          title: "Failed to load payment history",
          description: error.message,
          variant: "destructive",
        });
        return [];
      }

      return (data || []) as PayablePaymentRow[];
    },
    []
  );

  return { recordPayment, fetchPayments, saving };
}
