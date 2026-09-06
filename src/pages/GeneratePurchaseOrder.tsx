import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Printer, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { POProductSearch } from "@/components/POProductSearch";
import { POLineItemsTable } from "@/components/POLineItemsTable";
import { printPurchaseOrder } from "@/lib/printPurchaseOrder";
import { useSuppliers } from "@/hooks/useSuppliers";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { computeLineTotal, type DraftLineItem } from "@/hooks/usePurchaseOrderItems";
import { type Product } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";

/** Generates a reasonably unique voucher number suggestion. */
const suggestVoucherNo = () => `PO-${format(new Date(), "yyyyMMdd")}-${Date.now().toString().slice(-4)}`;

let keyCounter = 0;
const nextKey = () => `line-${keyCounter++}`;

const GeneratePurchaseOrder = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  // Pull a generous page of suppliers for the dropdown.
  const { suppliers, loading: suppliersLoading } = useSuppliers();
  const { createPurchaseOrderWithItems } = usePurchaseOrders();

  const [supplierId, setSupplierId] = useState<string>("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [voucherNo, setVoucherNo] = useState(suggestVoucherNo);
  const [orNo, setOrNo] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<DraftLineItem[]>([]);
  const [saving, setSaving] = useState(false);

  const selectedSupplier = suppliers.find((s) => s.id === supplierId);

  const handleAddProduct = (product: Product) => {
    setItems((prev) => {
      // If the product is already on the PO, bump its quantity instead of duplicating.
      const existing = prev.find((i) => i.product_sku === product.sku);
      if (existing) {
        return prev.map((i) =>
          i.key === existing.key ? { ...i, po_in_pcs: i.po_in_pcs + 1 } : i
        );
      }
      const line: DraftLineItem = {
        key: nextKey(),
        product_sku: product.sku,
        name: product.name || product.sku,
        unit: "",
        po_in_pcs: 1,
        unit_cost: product.price ?? 0,
        inventory_note: product.qty === null ? "" : `${product.qty} on hand`,
      };
      return [...prev, line];
    });
  };

  const handleChangeLine = (key: string, patch: Partial<DraftLineItem>) => {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...patch } : i)));
  };

  const handleRemoveLine = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handlePrint = () => {
    try {
      printPurchaseOrder({
        supplierName: selectedSupplier?.name || "",
        voucherNo,
        date,
        items: items.map((item) => ({
          name: item.name,
          unit: item.unit,
          po_in_pcs: item.po_in_pcs,
          unit_cost: item.unit_cost,
          line_total: computeLineTotal(item),
          inventory_note: item.inventory_note,
        })),
      });
    } catch (error) {
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Could not open print view.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async () => {
    if (!selectedSupplier) {
      toast({
        title: "Supplier required",
        description: "Select a supplier before generating the PO.",
        variant: "destructive",
      });
      return;
    }
    if (items.length === 0) {
      toast({
        title: "No items",
        description: "Add at least one product to the purchase order.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const id = await createPurchaseOrderWithItems(
      {
        date,
        voucher_no: voucherNo,
        supplier_id: selectedSupplier.id,
        supplier_name: selectedSupplier.name,
        or_no: orNo || undefined,
        payment_status: paymentStatus,
        notes: notes || undefined,
      },
      items
    );
    setSaving(false);

    if (id) {
      navigate("/purchase-orders");
    }
  };

  return (
    <PageContainer>
      <div className="print:hidden">
        <PageHeader
          title="Generate Purchase Order"
          description="Build a supplier PO from the product catalog"
          actions={
            <>
              <Button variant="ghost" onClick={() => navigate("/purchase-orders")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button variant="outline" onClick={handlePrint} disabled={items.length === 0}>
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Generate PO"}
              </Button>
            </>
          }
        />

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: header + line items */}
          <div className="space-y-6 lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Order Details</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger id="supplier">
                      <SelectValue
                        placeholder={suppliersLoading ? "Loading suppliers..." : "Select supplier"}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input
                    id="date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="voucher">Voucher No *</Label>
                  <Input
                    id="voucher"
                    value={voucherNo}
                    onChange={(e) => setVoucherNo(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="or">OR No</Label>
                  <Input id="or" value={orNo} onChange={(e) => setOrNo(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment">Payment Status</Label>
                  <Select
                    value={paymentStatus}
                    onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}
                  >
                    <SelectTrigger id="payment">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes for this order"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <POLineItemsTable
                  items={items}
                  onChange={handleChangeLine}
                  onRemove={handleRemoveLine}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right: product search */}
          <div>
            <Card className="lg:sticky lg:top-20">
              <CardHeader>
                <CardTitle>Add Products</CardTitle>
              </CardHeader>
              <CardContent>
                <POProductSearch onAdd={handleAddProduct} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageContainer>
  );
};

export default GeneratePurchaseOrder;
