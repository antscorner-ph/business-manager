import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Pencil, Trash2, ChevronLeft, ChevronRight, Search, Eye } from "lucide-react";
import {
  PurchaseOrder,
  CreatePurchaseOrderData,
  PurchaseOrdersQuery,
} from "@/hooks/usePurchaseOrders";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { POItemsDialog } from "@/components/POItemsDialog";
import { STATUS_TAG_CLASSES, formatTagLabel, getTagClass } from "@/lib/tagStyles";
import { formatDate } from "@/lib/utils";

interface PurchaseOrdersManagerProps {
  purchaseOrders: PurchaseOrder[];
  totalCount: number;
  query: PurchaseOrdersQuery;
  onQueryChange: (query: PurchaseOrdersQuery) => void;
  onUpdatePurchaseOrder: (id: string, updates: Partial<PurchaseOrder>) => Promise<boolean>;
  onUpdatePaymentStatus: (id: string, paymentStatus: 'unpaid' | 'partial' | 'paid', partialPaymentNotes?: string) => Promise<boolean>;
  onUpdateStatus: (id: string, status: 'pending' | 'approved' | 'cancelled') => Promise<boolean>;
  onDeletePurchaseOrder: (id: string) => Promise<boolean>;
}

export const PurchaseOrdersManager = ({
  purchaseOrders,
  totalCount,
  query,
  onQueryChange,
  onUpdatePurchaseOrder,
  onUpdatePaymentStatus,
  onUpdateStatus,
  onDeletePurchaseOrder,
}: PurchaseOrdersManagerProps) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [formData, setFormData] = useState<CreatePurchaseOrderData>({
    date: new Date().toISOString().split("T")[0],
    voucher_no: "",
    supplier_name: "",
    or_no: "",
    total_amount: 0,
    partial_payment_notes: "",
    payment_status: "unpaid",
    status: "pending",
    delivered_date: "",
    notes: "",
  });
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Pagination logic
  const totalPages = Math.ceil(totalCount / query.pageSize);

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPO) return;
    
    const success = await onUpdatePurchaseOrder(selectedPO.id, formData);
    if (success) {
      setIsEditDialogOpen(false);
      setSelectedPO(null);
    }
  };

  const handleAddPayment = async () => {
    if (!selectedPO || !paymentAmount) return;
    
    const newNotes = selectedPO.partial_payment_notes 
      ? `${selectedPO.partial_payment_notes}\n₱${paymentAmount.toFixed(2)} - ${new Date().toLocaleDateString()}`
      : `₱${paymentAmount.toFixed(2)} - ${new Date().toLocaleDateString()}`;
    
    // Determine payment status based on context (this could be enhanced)
    const paymentStatus: 'unpaid' | 'partial' | 'paid' = 'partial';
    
    const success = await onUpdatePaymentStatus(
      selectedPO.id,
      paymentStatus,
      newNotes
    );
    
    if (success) {
      setIsPaymentDialogOpen(false);
      setSelectedPO(null);
      setPaymentAmount(0);
    }
  };

  const handleDelete = async () => {
    if (!selectedPO) return;
    const success = await onDeletePurchaseOrder(selectedPO.id);
    if (success) {
      setDeleteDialogOpen(false);
      setSelectedPO(null);
    }
  };

  const openEditDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setFormData({
      date: po.date,
      voucher_no: po.voucher_no,
      supplier_name: po.supplier_name,
      or_no: po.or_no || "",
      total_amount: po.total_amount,
      partial_payment_notes: po.partial_payment_notes || "",
      payment_status: po.payment_status,
      status: po.status,
      delivered_date: po.delivered_date || "",
      notes: po.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const openPaymentDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setPaymentAmount(0);
    setIsPaymentDialogOpen(true);
  };

  const openDeleteDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setDeleteDialogOpen(true);
  };

  const openItemsDialog = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setItemsDialogOpen(true);
  };

  const getPaymentStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={getTagClass(STATUS_TAG_CLASSES, status)}>
        {formatTagLabel(status)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={getTagClass(STATUS_TAG_CLASSES, status)}>
        {formatTagLabel(status)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Purchase Orders</CardTitle>
              <Button asChild>
                <Link to="/purchase-orders/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Generate Purchase Order
                </Link>
              </Button>
          </div>
            <div className="grid gap-4 md:grid-cols-5">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                   <Input
                     placeholder="Search voucher or supplier..."
                     value={query.search}
                     onChange={(e) => {
                       onQueryChange({ ...query, search: e.target.value, page: 1 });
                     }}
                     className="flex-1"
                   />
              </div>
              <Select value={query.sortBy} onValueChange={(value: PurchaseOrdersQuery["sortBy"]) => onQueryChange({ ...query, sortBy: value, page: 1 })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="amount">Sort by Amount</SelectItem>
                  <SelectItem value="supplier">Sort by Supplier</SelectItem>
                </SelectContent>
              </Select>
              <Select value={query.paymentStatus} onValueChange={(value: PurchaseOrdersQuery["paymentStatus"]) => {
                onQueryChange({ ...query, paymentStatus: value, page: 1 });
              }}>
                   <SelectTrigger>
                     <SelectValue placeholder="Payment Status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">All Payment Status</SelectItem>
                     <SelectItem value="unpaid">Unpaid</SelectItem>
                     <SelectItem value="partial">Partial</SelectItem>
                     <SelectItem value="paid">Paid</SelectItem>
                   </SelectContent>
                 </Select>
              <Select value={query.status} onValueChange={(value: PurchaseOrdersQuery["status"]) => {
                onQueryChange({ ...query, status: value, page: 1 });
              }}>
                   <SelectTrigger>
                     <SelectValue placeholder="Status" />
                   </SelectTrigger>
                   <SelectContent>
                     <SelectItem value="all">All Status</SelectItem>
                     <SelectItem value="pending">Pending</SelectItem>
                     <SelectItem value="approved">Approved</SelectItem>
                     <SelectItem value="cancelled">Cancelled</SelectItem>
                   </SelectContent>
                 </Select>
              <Button variant="outline" onClick={() => {
                onQueryChange({
                  ...query,
                  search: "",
                  paymentStatus: "all",
                  status: "all",
                  sortBy: "date",
                  page: 1,
                });
              }}>
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Voucher No</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>OR No.</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Payment Notes</TableHead>
                  <TableHead>Payment Status</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Delivered Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                 {purchaseOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center text-muted-foreground">
                      No purchase orders found
                    </TableCell>
                  </TableRow>
                ) : (
                  purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell>{formatDate(po.date)}</TableCell>
                      <TableCell className="font-medium">{po.voucher_no}</TableCell>
                      <TableCell>{po.supplier_name}</TableCell>
                      <TableCell>{po.or_no || "-"}</TableCell>
                      <TableCell>
                        <Button
                          variant="link"
                          className="h-auto p-0"
                          onClick={() => openItemsDialog(po)}
                        >
                          {po.item_count} {po.item_count === 1 ? "item" : "items"}
                        </Button>
                      </TableCell>
                      <TableCell className="text-right">
                        ₱{po.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {po.partial_payment_notes || "-"}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(po.payment_status)}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell>{formatDate(po.delivered_date)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openItemsDialog(po)}
                            title="View Items"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openPaymentDialog(po)}
                            title="Add Payment"
                          >
                            ₱
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(po)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(po)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
            {totalCount > query.pageSize && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {totalCount === 0 ? 0 : (query.page - 1) * query.pageSize + 1} to {Math.min(query.page * query.pageSize, totalCount)} of {totalCount} entries
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQueryChange({ ...query, page: Math.max(query.page - 1, 1) })}
                  disabled={query.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {query.page} of {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onQueryChange({ ...query, page: Math.min(query.page + 1, totalPages || 1) })}
                  disabled={query.page === totalPages || totalPages === 0}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Purchase Order</DialogTitle>
              <DialogDescription>
                Update purchase order details
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-date">Date *</Label>
                  <Input
                    id="edit-date"
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-voucher_no">Voucher No *</Label>
                  <Input
                    id="edit-voucher_no"
                    value={formData.voucher_no}
                    onChange={(e) =>
                      setFormData({ ...formData, voucher_no: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-supplier_name">Supplier Name *</Label>
                  <Input
                    id="edit-supplier_name"
                    value={formData.supplier_name}
                    onChange={(e) =>
                      setFormData({ ...formData, supplier_name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-or_no">OR No.</Label>
                  <Input
                    id="edit-or_no"
                    value={formData.or_no}
                    onChange={(e) =>
                      setFormData({ ...formData, or_no: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-total_amount">Total Amount *</Label>
                  <Input
                    id="edit-total_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total_amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        total_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: PurchaseOrder["status"]) =>
                      setFormData({ ...formData, status: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-delivered_date">Delivered Date</Label>
                <Input
                  id="edit-delivered_date"
                  type="date"
                  value={formData.delivered_date}
                  onChange={(e) =>
                    setFormData({ ...formData, delivered_date: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  placeholder="Additional notes"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Update Purchase Order</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Add a payment for {selectedPO?.supplier_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <p className="text-2xl font-bold">
                ₱{selectedPO?.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Current Payment Notes</Label>
              <div className="p-2 bg-muted rounded-md max-h-32 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">
                  {selectedPO?.partial_payment_notes || "No payment notes yet"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment-amount">Payment Amount *</Label>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAddPayment}>Add Payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Items Dialog */}
      <POItemsDialog
        open={itemsDialogOpen}
        onOpenChange={setItemsDialogOpen}
        purchaseOrderId={selectedPO?.id ?? null}
        voucherNo={selectedPO?.voucher_no}
        supplierName={selectedPO?.supplier_name}
        date={selectedPO?.date}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the purchase order for {selectedPO?.supplier_name}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
