import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Plus, ChevronLeft, ChevronRight, Pencil, Search, ReceiptText, Trash2 } from "lucide-react";
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
import { Expense, ExpensesQuery, UpdateExpenseInput } from "@/hooks/useExpenses";
import {
  EXPENSE_CATEGORY_TAG_CLASSES,
  PAYMENT_METHOD_TAG_CLASSES,
  STATUS_TAG_CLASSES,
  formatTagLabel,
  getTagClass,
} from "@/lib/tagStyles";
import { DEFAULT_EXPENSE_CATEGORY, EXPENSE_CATEGORY_OPTIONS } from "@/lib/expenseCategories";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

interface ExpensesManagerProps {
  expenses: Expense[];
  totalCount: number;
  query: ExpensesQuery;
  onQueryChange: (query: ExpensesQuery) => void;
  onAddExpense: (expense: Omit<Expense, "id" | "created_at" | "updated_at">) => Promise<void>;
  onUpdateExpense: (id: string, updates: UpdateExpenseInput) => Promise<void>;
  onUpdateStatus: (id: string, status: "paid" | "unpaid" | "partially_paid") => Promise<void>;
  onDeleteExpense: (id: string) => Promise<void>;
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "gcash", label: "GCash" },
  { value: "check", label: "Check" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "other", label: "Other" },
];

export function ExpensesManager({
  expenses,
  totalCount,
  query,
  onQueryChange,
  onAddExpense,
  onUpdateExpense,
  onUpdateStatus,
  onDeleteExpense,
}: ExpensesManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [expenseDate, setExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(DEFAULT_EXPENSE_CATEGORY);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash" | "check" | "bank_transfer" | "other">("cash");
  const [status, setStatus] = useState<"paid" | "unpaid" | "partially_paid">("paid");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [amountError, setAmountError] = useState("");
  const [editExpenseDate, setEditExpenseDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState(DEFAULT_EXPENSE_CATEGORY);
  const [editPaymentMethod, setEditPaymentMethod] = useState<"cash" | "gcash" | "check" | "bank_transfer" | "other">("cash");
  const [editStatus, setEditStatus] = useState<"paid" | "unpaid" | "partially_paid">("paid");
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editAmountError, setEditAmountError] = useState("");
  const [searchInput, setSearchInput] = useState(query.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(query.search);
  }, [query.search]);

  useEffect(() => {
    if (debouncedSearch === query.search) return;
    onQueryChange({ ...query, search: debouncedSearch, page: 1 });
  }, [debouncedSearch, query, onQueryChange]);

  const totalPages = Math.ceil(totalCount / query.pageSize);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(value);

  const validateAmount = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Amount is required";
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return "Use up to 2 decimal places";

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) return "Amount must be greater than 0";

    return "";
  };

  const currentAmountError = validateAmount(amount);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateAmount(amount);
    if (validationError) {
      setAmountError(validationError);
      return;
    }

    if (!description || !category) return;

    await onAddExpense({
      expense_date: expenseDate,
      description,
      category,
      payment_method: paymentMethod,
      status,
      amount: Number(amount),
      notes: notes || null,
    });

    setExpenseDate(format(new Date(), "yyyy-MM-dd"));
    setDescription("");
    setCategory(DEFAULT_EXPENSE_CATEGORY);
    setPaymentMethod("cash");
    setStatus("paid");
    setAmount("");
    setNotes("");
    setAmountError("");
    setAddDialogOpen(false);
  };

  const openEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setEditExpenseDate(expense.expense_date);
    setEditDescription(expense.description);
    setEditCategory(expense.category || DEFAULT_EXPENSE_CATEGORY);
    setEditPaymentMethod(expense.payment_method || "cash");
    setEditStatus(expense.status as "paid" | "unpaid" | "partially_paid");
    setEditAmount(String(expense.amount));
    setEditNotes(expense.notes || "");
    setEditAmountError("");
    setEditDialogOpen(true);
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingExpense) return;

    const validationError = validateAmount(editAmount);
    if (validationError) {
      setEditAmountError(validationError);
      return;
    }

    if (!editDescription || !editCategory) return;

    await onUpdateExpense(editingExpense.id, {
      expense_date: editExpenseDate,
      description: editDescription,
      category: editCategory,
      payment_method: editPaymentMethod,
      status: editStatus,
      amount: Number(editAmount),
      notes: editNotes || null,
    });

    setEditDialogOpen(false);
    setEditingExpense(null);
    setEditExpenseDate(format(new Date(), "yyyy-MM-dd"));
    setEditDescription("");
    setEditCategory(DEFAULT_EXPENSE_CATEGORY);
    setEditPaymentMethod("cash");
    setEditStatus("paid");
    setEditAmount("");
    setEditNotes("");
    setEditAmountError("");
  };

  const renderCategoryTag = (value: string) => (
    <Badge
      variant="outline"
      className={getTagClass(EXPENSE_CATEGORY_TAG_CLASSES, value)}
    >
      {value}
    </Badge>
  );

  const renderPaymentMethodTag = (value: string) => (
    <Badge variant="outline" className={getTagClass(PAYMENT_METHOD_TAG_CLASSES, value)}>
      {formatTagLabel(value)}
    </Badge>
  );

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText className="h-5 w-5" />
                Expenses Tracking
              </CardTitle>
              <CardDescription>Record and monitor operating expenses</CardDescription>
            </div>

            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <form onSubmit={handleAddExpense}>
                  <DialogHeader>
                    <DialogTitle>Add Expense</DialogTitle>
                    <DialogDescription>
                      Record an expense entry from your daily operations.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="expenseDate">Date</Label>
                      <Input
                        id="expenseDate"
                        type="date"
                        value={expenseDate}
                        onChange={(e) => setExpenseDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description *</Label>
                      <Input
                        id="description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="e.g., Electric Bill"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">Category *</Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger id="category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPENSE_CATEGORY_OPTIONS.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Payment</Label>
                        <Select
                          value={paymentMethod}
                          onValueChange={(value: "cash" | "gcash" | "check" | "bank_transfer" | "other") => setPaymentMethod(value)}
                        >
                          <SelectTrigger id="paymentMethod">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((item) => (
                              <SelectItem key={item.value} value={item.value}>
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={status}
                          onValueChange={(value: "paid" | "unpaid" | "partially_paid") => setStatus(value)}
                        >
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="unpaid">Unpaid</SelectItem>
                            <SelectItem value="partially_paid">Partially Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={amount}
                        onChange={(e) => {
                          setAmount(e.target.value);
                          if (amountError) {
                            setAmountError(validateAmount(e.target.value));
                          }
                        }}
                        placeholder="0.00"
                        aria-invalid={Boolean(amountError || currentAmountError)}
                        required
                      />
                      {amountError && (
                        <p className="text-sm text-destructive">{amountError}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Optional notes"
                        rows={3}
                      />
                    </div>
                  </div>

                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={!description || !category || !!currentAmountError}>
                      Save Expense
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
            <div className="flex items-center gap-2 sm:col-span-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search description, notes, category..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <Select
              value={query.sortBy}
              onValueChange={(value: ExpensesQuery["sortBy"]) =>
                onQueryChange({ ...query, sortBy: value, page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date_asc">Date Oldest First</SelectItem>
                <SelectItem value="date_desc">Date Newest First</SelectItem>
                <SelectItem value="amount_asc">Amount Low to High</SelectItem>
                <SelectItem value="amount_desc">Amount High to Low</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={query.status}
              onValueChange={(value: ExpensesQuery["status"]) =>
                onQueryChange({ ...query, status: value, page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partially_paid">Partially Paid</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={query.paymentMethod}
              onValueChange={(value: ExpensesQuery["paymentMethod"]) =>
                onQueryChange({ ...query, paymentMethod: value, page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Payment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                {PAYMENT_METHODS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => {
                onQueryChange({
                  ...query,
                  page: 1,
                  search: "",
                  sortBy: "date_desc",
                  status: "all",
                  paymentMethod: "all",
                  category: "all",
                });
              }}
            >
              Clear Filters
            </Button>
          </div>
        </div>
      </CardHeader>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUpdateExpense}>
            <DialogHeader>
              <DialogTitle>Edit Expense</DialogTitle>
              <DialogDescription>Update the expense details and category.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="editExpenseDate">Date</Label>
                <Input
                  id="editExpenseDate"
                  type="date"
                  value={editExpenseDate}
                  onChange={(e) => setEditExpenseDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editDescription">Description *</Label>
                <Input
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="e.g., Electric Bill"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editCategory">Category *</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger id="editCategory">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORY_OPTIONS.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="editPaymentMethod">Payment</Label>
                  <Select
                    value={editPaymentMethod}
                    onValueChange={(value: "cash" | "gcash" | "check" | "bank_transfer" | "other") => setEditPaymentMethod(value)}
                  >
                    <SelectTrigger id="editPaymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editStatus">Status</Label>
                  <Select
                    value={editStatus}
                    onValueChange={(value: "paid" | "unpaid" | "partially_paid") => setEditStatus(value)}
                  >
                    <SelectTrigger id="editStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partially_paid">Partially Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="editAmount">Amount *</Label>
                <Input
                  id="editAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={editAmount}
                  onChange={(e) => {
                    setEditAmount(e.target.value);
                    if (editAmountError) {
                      setEditAmountError(validateAmount(e.target.value));
                    }
                  }}
                  placeholder="0.00"
                  aria-invalid={Boolean(editAmountError)}
                  required
                />
                {editAmountError && <p className="text-sm text-destructive">{editAmountError}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Optional notes"
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!editDescription || !editCategory || !!editAmountError}>
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No expenses recorded yet
                  </TableCell>
                </TableRow>
              ) : (
                expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{format(new Date(expense.expense_date), "MMM dd, yyyy")}</TableCell>
                    <TableCell className="font-medium">{expense.description}</TableCell>
                    <TableCell>{renderCategoryTag(expense.category)}</TableCell>
                    <TableCell>{renderPaymentMethodTag(expense.payment_method)}</TableCell>
                    <TableCell>
                      <Select
                        value={expense.status}
                        onValueChange={(value: "paid" | "unpaid" | "partially_paid") => onUpdateStatus(expense.id, value)}
                      >
                        <SelectTrigger className={`h-8 w-[150px] ${getTagClass(STATUS_TAG_CLASSES, expense.status)}`}>
                          <SelectValue>{formatTagLabel(expense.status)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="unpaid">Unpaid</SelectItem>
                          <SelectItem value="partially_paid">Partially Paid</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="font-semibold">{formatCurrency(expense.amount)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[220px] truncate">
                      {expense.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEditDialog(expense)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteExpense(expense.id)}
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
              Showing {totalCount === 0 ? 0 : (query.page - 1) * query.pageSize + 1} to {Math.min(query.page * query.pageSize, totalCount)} of {totalCount} expenses
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
  );
}
