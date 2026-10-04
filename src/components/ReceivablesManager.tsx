import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, X, DollarSign, Calendar, User, ChevronLeft, ChevronRight, Search, Pencil, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ReceivablesQuery } from "@/hooks/useReceivables";
import { STATUS_TAG_CLASSES, formatTagLabel, getTagClass } from "@/lib/tagStyles";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

export interface Receivable {
  id: string;
  customer_name: string;
  description: string | null;
  amount: number;
  date_issued: string;
  due_date: string | null;
  status: string;
  amount_paid: number;
  balance: number;
  notes: string | null;
}

export interface ReceivablePayment {
  id: string;
  receivable_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  notes: string | null;
}

interface ReceivablesManagerProps {
  receivables: Receivable[];
  totalCount: number;
  query: ReceivablesQuery;
  onQueryChange: (query: ReceivablesQuery) => void;
  onAddReceivable: (receivable: Omit<Receivable, "id" | "status" | "amount_paid" | "balance">) => Promise<void>;
  onUpdateReceivable: (id: string, updates: Partial<Omit<Receivable, "id" | "status" | "amount_paid" | "balance" | "created_at" | "updated_at">>) => Promise<void>;
  onAddPayment: (payment: Omit<ReceivablePayment, "id">) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
  loading?: boolean;
}

export function ReceivablesManager({
  receivables,
  totalCount,
  query,
  onQueryChange,
  onAddReceivable,
  onUpdateReceivable,
  onAddPayment,
  onUpdateStatus,
  loading = false,
}: ReceivablesManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedReceivable, setSelectedReceivable] = useState<Receivable | null>(null);

  // Form states for adding receivable
  const [customerName, setCustomerName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dateIssued, setDateIssued] = useState(format(new Date(), "yyyy-MM-dd"));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Form states for editing receivable
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editDateIssued, setEditDateIssued] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Form states for adding payment
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(query.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(query.search);
  }, [query.search]);

  useEffect(() => {
    if (debouncedSearch === query.search) return;
    onQueryChange({ ...query, search: debouncedSearch, page: 1 });
  }, [debouncedSearch, query, onQueryChange]);

  // Pagination logic
  const totalPages = Math.ceil(totalCount / query.pageSize);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const handleAddReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !amount) return;

    await onAddReceivable({
      customer_name: customerName,
      description: description || null,
      amount: parseFloat(amount),
      date_issued: dateIssued,
      due_date: dueDate || null,
      notes: notes || null,
    });

    // Reset form
    setCustomerName("");
    setDescription("");
    setAmount("");
    setDateIssued(format(new Date(), "yyyy-MM-dd"));
    setDueDate("");
    setNotes("");
    setAddDialogOpen(false);
  };

  const handleEditReceivable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable || !editCustomerName || !editAmount) return;

    await onUpdateReceivable(selectedReceivable.id, {
      customer_name: editCustomerName,
      description: editDescription || null,
      amount: Number(editAmount),
      date_issued: editDateIssued,
      due_date: editDueDate || null,
      notes: editNotes || null,
    });

    setEditCustomerName("");
    setEditDescription("");
    setEditAmount("");
    setEditDateIssued(format(new Date(), "yyyy-MM-dd"));
    setEditDueDate("");
    setEditNotes("");
    setEditDialogOpen(false);
    setSelectedReceivable(null);
  };

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReceivable || !paymentAmount) return;

    const parsedAmount = Number(paymentAmount);
    const remainingBalance = Number(selectedReceivable.balance || 0);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setPaymentError("Payment amount must be greater than zero.");
      return;
    }

    if (parsedAmount > remainingBalance) {
      setPaymentError(`Payment exceeds remaining balance of ${formatCurrency(remainingBalance)}.`);
      return;
    }

    setPaymentError(null);

    try {
      await onAddPayment({
        receivable_id: selectedReceivable.id,
        amount: parsedAmount,
        payment_date: paymentDate,
        payment_method: paymentMethod,
        notes: paymentNotes || null,
      });
    } catch {
      // The server enforces overpayment guards too; keep dialog open for correction.
      return;
    }

    // Reset form
    setPaymentAmount("");
    setPaymentDate(format(new Date(), "yyyy-MM-dd"));
    setPaymentMethod("cash");
    setPaymentNotes("");
    setPaymentError(null);
    setPaymentDialogOpen(false);
    setSelectedReceivable(null);
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant="outline" className={getTagClass(STATUS_TAG_CLASSES, status)}>
        {formatTagLabel(status)}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Receivables Management
              </CardTitle>
              <CardDescription>Track credit sales and customer payments</CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Receivable
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleAddReceivable}>
                <DialogHeader>
                  <DialogTitle>Add New Receivable</DialogTitle>
                  <DialogDescription>
                    Record a new credit sale or amount owed
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer">Customer Name *</Label>
                    <Input
                      id="customer"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="What was purchased or reason"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dateIssued">Date Issued</Label>
                      <Input
                        id="dateIssued"
                        type="date"
                        value={dateIssued}
                        onChange={(e) => setDateIssued(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dueDate">Due Date</Label>
                      <Input
                        id="dueDate"
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Additional notes"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Receivable</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customer name..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="flex-1"
                />
                {loading && (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                )}
              </div>
              <Select value={query.sortBy} onValueChange={(value: ReceivablesQuery["sortBy"]) => onQueryChange({ ...query, sortBy: value, page: 1 })}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Sort by Date</SelectItem>
                  <SelectItem value="balance">Sort by Balance</SelectItem>
                  <SelectItem value="duedate">Sort by Due Date</SelectItem>
                </SelectContent>
              </Select>
              <Select value={query.status} onValueChange={(value: ReceivablesQuery["status"]) => {
                onQueryChange({ ...query, status: value, page: 1 });
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="written_off">Written Off</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => {
                onQueryChange({
                  ...query,
                  search: "",
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
                <TableHead>Customer</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading receivables...
                    </div>
                  </TableCell>
                </TableRow>
              ) : receivables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No receivables recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                receivables.map((receivable) => (
                  <TableRow key={receivable.id}>
                    <TableCell className="font-medium">
                      {receivable.customer_name}
                    </TableCell>
                    <TableCell>{receivable.description || "-"}</TableCell>
                    <TableCell>{formatCurrency(receivable.amount)}</TableCell>
                    <TableCell>{formatCurrency(receivable.amount_paid)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(receivable.balance)}
                    </TableCell>
                    <TableCell>
                      {receivable.due_date
                        ? format(new Date(receivable.due_date), "MMM dd, yyyy")
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(receivable.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedReceivable(receivable);
                            setEditCustomerName(receivable.customer_name);
                            setEditDescription(receivable.description || "");
                            setEditAmount(String(receivable.amount));
                            setEditDateIssued(receivable.date_issued || format(new Date(), "yyyy-MM-dd"));
                            setEditDueDate(receivable.due_date || "");
                            setEditNotes(receivable.notes || "");
                            setEditDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                        {receivable.status !== "paid" && receivable.status !== "written_off" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedReceivable(receivable);
                              setPaymentAmount("");
                              setPaymentDate(format(new Date(), "yyyy-MM-dd"));
                              setPaymentMethod("cash");
                              setPaymentNotes("");
                              setPaymentError(null);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <DollarSign className="h-3 w-3 mr-1" />
                            Payment
                          </Button>
                        )}
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
              Showing {totalCount === 0 ? 0 : (query.page - 1) * query.pageSize + 1} to {Math.min(query.page * query.pageSize, totalCount)} of {totalCount} receivables
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

        {/* Edit Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleEditReceivable}>
              <DialogHeader>
                <DialogTitle>Edit Receivable</DialogTitle>
                <DialogDescription>
                  Update the selected receivable details.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="editCustomerName">Customer Name *</Label>
                  <Input
                    id="editCustomerName"
                    value={editCustomerName}
                    onChange={(e) => setEditCustomerName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editAmount">Amount *</Label>
                  <Input
                    id="editAmount"
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editDescription">Description</Label>
                  <Input
                    id="editDescription"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editDateIssued">Date Issued</Label>
                    <Input
                      id="editDateIssued"
                      type="date"
                      value={editDateIssued}
                      onChange={(e) => setEditDateIssued(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editDueDate">Due Date</Label>
                    <Input
                      id="editDueDate"
                      type="date"
                      value={editDueDate}
                      onChange={(e) => setEditDueDate(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editNotes">Notes</Label>
                  <Textarea
                    id="editNotes"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditDialogOpen(false);
                    setSelectedReceivable(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleAddPayment}>
              <DialogHeader>
                <DialogTitle>Record Payment</DialogTitle>
                <DialogDescription>
                  {selectedReceivable && (
                    <>
                      Customer: <strong>{selectedReceivable.customer_name}</strong>
                      <br />
                      Balance: <strong>{formatCurrency(selectedReceivable.balance)}</strong>
                    </>
                  )}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">Payment Amount *</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                      setPaymentError(null);
                    }}
                    placeholder="0.00"
                    max={selectedReceivable?.balance}
                    required
                  />
                  {selectedReceivable ? (
                    <p className="text-xs text-muted-foreground">
                      Remaining balance: {formatCurrency(selectedReceivable.balance)}
                    </p>
                  ) : null}
                  {paymentError ? (
                    <p className="text-xs text-destructive">{paymentError}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="check">Check</SelectItem>
                      <SelectItem value="gcash">GCash</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentNotes">Notes</Label>
                  <Textarea
                    id="paymentNotes"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Additional notes"
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPaymentDialogOpen(false);
                    setSelectedReceivable(null);
                    setPaymentError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Record Payment</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
