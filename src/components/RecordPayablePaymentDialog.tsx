import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  computePayableStatus,
  remainingPayableBalance,
  validatePayablePayment,
} from "@/lib/financeMath";
import type { PayableRecord } from "@/hooks/usePayables";
import {
  usePayablePayments,
  type PayablePaymentMethod,
} from "@/hooks/usePayablePayments";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

const PAYMENT_METHODS: { value: PayablePaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "gcash", label: "GCash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

interface Props {
  payable: PayableRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecorded: () => void;
}

export function RecordPayablePaymentDialog({ payable, open, onOpenChange, onRecorded }: Props) {
  const { recordPayment, saving } = usePayablePayments();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState<PayablePaymentMethod>("cash");
  const [notes, setNotes] = useState("");

  const remaining = payable ? remainingPayableBalance(payable.totalAmount, payable.amountPaid) : 0;

  // Reset the form whenever a new payable is opened.
  useEffect(() => {
    if (open && payable) {
      setAmount(remaining > 0 ? String(remaining) : "");
      setPaymentDate(format(new Date(), "yyyy-MM-dd"));
      setPaymentMethod("cash");
      setNotes("");
    }
  }, [open, payable, remaining]);

  const parsedAmount = Number(amount);
  const validation = useMemo(
    () =>
      payable
        ? validatePayablePayment({
            amount: parsedAmount,
            totalAmount: payable.totalAmount,
            totalPaid: payable.amountPaid,
          })
        : ({ ok: false, reason: "" } as const),
    [payable, parsedAmount]
  );

  const projectedStatus = useMemo(() => {
    if (!payable || !validation.ok) return null;
    return computePayableStatus(
      payable.source,
      payable.totalAmount,
      payable.amountPaid + parsedAmount
    );
  }, [payable, validation, parsedAmount]);

  const handleSubmit = async () => {
    if (!payable || !validation.ok) return;

    const ok = await recordPayment({
      sourceType: payable.source,
      sourceId: payable.id,
      amount: parsedAmount,
      paymentDate,
      paymentMethod,
      notes,
    });

    if (ok) {
      onOpenChange(false);
      onRecorded();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            {payable
              ? `${payable.reference} · ${payable.payee}`
              : "Record a payment against this payable."}
          </DialogDescription>
        </DialogHeader>

        {payable && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/40 p-3 text-sm">
              <div>
                <p className="text-muted-foreground">Total</p>
                <p className="font-medium">{formatCurrency(payable.totalAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Paid</p>
                <p className="font-medium">{formatCurrency(payable.amountPaid)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Remaining</p>
                <p className="font-medium">{formatCurrency(remaining)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payable-amount">Amount</Label>
              <Input
                id="payable-amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payable-date">Payment Date</Label>
              <Input
                id="payable-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payable-method">Payment Method</Label>
              <Select
                value={paymentMethod}
                onValueChange={(value: PayablePaymentMethod) => setPaymentMethod(value)}
              >
                <SelectTrigger id="payable-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payable-notes">Notes (optional)</Label>
              <Textarea
                id="payable-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reference number, remarks..."
                rows={2}
              />
            </div>

            {amount !== "" && !validation.ok && (
              <p className="text-sm text-destructive">{validation.reason}</p>
            )}
            {validation.ok && projectedStatus && (
              <p className="text-sm text-muted-foreground">
                After this payment the {payable.source === "purchase_order" ? "purchase order" : "expense"}{" "}
                will be marked <span className="font-medium">{projectedStatus.replace("_", " ")}</span>.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving || !validation.ok}>
            {saving ? "Recording..." : "Record Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
