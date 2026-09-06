import { useEffect, useState } from "react";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { printPurchaseOrder } from "@/lib/printPurchaseOrder";
import { toast } from "@/hooks/use-toast";
import {
  usePurchaseOrderItems,
  type PurchaseOrderItem,
} from "@/hooks/usePurchaseOrderItems";

interface POItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string | null;
  voucherNo?: string;
  supplierName?: string;
  date?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

/** Read-only dialog listing the structured line items of a purchase order. */
export function POItemsDialog({
  open,
  onOpenChange,
  purchaseOrderId,
  voucherNo,
  supplierName,
  date,
}: POItemsDialogProps) {
  const { getItems } = usePurchaseOrderItems();
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !purchaseOrderId) return;
    let cancelled = false;
    setLoading(true);
    getItems(purchaseOrderId).then((data) => {
      if (!cancelled) {
        setItems(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, purchaseOrderId, getItems]);

  const grandTotal = items.reduce((sum, item) => sum + item.line_total, 0);

  const handlePrint = () => {
    try {
      printPurchaseOrder({
        supplierName: supplierName || "",
        voucherNo: voucherNo || "",
        date: date || "",
        items,
      });
    } catch (error) {
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Could not open print view.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Purchase Order Items</DialogTitle>
          <DialogDescription>
            {voucherNo ? `${voucherNo}` : "Items"}
            {supplierName ? ` · ${supplierName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading items...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            No line items recorded for this purchase order.
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">PO in pcs</TableHead>
                  <TableHead className="text-right">Unit cost</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Inventory</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.unit || "-"}</TableCell>
                    <TableCell className="text-right">{item.po_in_pcs}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.line_total)}</TableCell>
                    <TableCell>{item.inventory_note || "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">
                    Grand Total
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(grandTotal)}
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handlePrint} disabled={items.length === 0}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
