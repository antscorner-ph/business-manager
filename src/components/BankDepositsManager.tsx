import { useState } from "react";
import { format } from "date-fns";
import { Plus, X, Building2, Calendar, Receipt, ChevronLeft, ChevronRight, Search } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BankDepositsQuery } from "@/hooks/useBankDeposits";

export interface BankDeposit {
  id: string;
  deposit_date: string;
  bank_name: string;
  account_number: string | null;
  total_amount: number;
  deposit_slip_number: string | null;
  notes: string | null;
  status: string;
}

export interface BankDepositItem {
  id: string;
  bank_deposit_id: string;
  source: string;
  reference_date: string | null;
  amount: number;
  notes: string | null;
}

interface BankDepositsManagerProps {
  deposits: BankDeposit[];
  depositItems: Record<string, BankDepositItem[]>;
  totalCount: number;
  query: BankDepositsQuery;
  onQueryChange: (query: BankDepositsQuery) => void;
  onAddDeposit: (deposit: Omit<BankDeposit, "id" | "total_amount" | "status">) => Promise<string>;
  onAddDepositItem: (item: Omit<BankDepositItem, "id">) => Promise<void>;
  onUpdateStatus: (id: string, status: string) => Promise<void>;
}

export function BankDepositsManager({
  deposits,
  depositItems,
  totalCount,
  query,
  onQueryChange,
  onAddDeposit,
  onAddDepositItem,
  onUpdateStatus,
}: BankDepositsManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [selectedDepositId, setSelectedDepositId] = useState<string | null>(null);

  // Form states for adding deposit
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [depositDate, setDepositDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [slipNumber, setSlipNumber] = useState("");
  const [notes, setNotes] = useState("");

  // Form states for adding deposit item
  const [source, setSource] = useState("");
  const [referenceDate, setReferenceDate] = useState("");
  const [amount, setAmount] = useState("");
  const [itemNotes, setItemNotes] = useState("");

  // Pagination logic
  const totalPages = Math.ceil(totalCount / query.pageSize);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName) return;

    const depositId = await onAddDeposit({
      bank_name: bankName,
      account_number: accountNumber || null,
      deposit_date: depositDate,
      deposit_slip_number: slipNumber || null,
      notes: notes || null,
    });

    // Reset form
    setBankName("");
    setAccountNumber("");
    setDepositDate(format(new Date(), "yyyy-MM-dd"));
    setSlipNumber("");
    setNotes("");
    setAddDialogOpen(false);

    // Open item dialog to add items
    setSelectedDepositId(depositId);
    setItemDialogOpen(true);
  };

  const handleAddDepositItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDepositId || !source || !amount) return;

    await onAddDepositItem({
      bank_deposit_id: selectedDepositId,
      source,
      reference_date: referenceDate || null,
      amount: parseFloat(amount),
      notes: itemNotes || null,
    });

    // Reset item form
    setSource("");
    setReferenceDate("");
    setAmount("");
    setItemNotes("");
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      confirmed: "default",
      reconciled: "outline",
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {status.toUpperCase()}
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
                <Building2 className="h-5 w-5" />
                Bank Deposits
              </CardTitle>
              <CardDescription>Track weekly bank deposits and cash flow</CardDescription>
            </div>
            <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Deposit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleAddDeposit}>
                <DialogHeader>
                  <DialogTitle>Record Bank Deposit</DialogTitle>
                  <DialogDescription>
                    Create a new bank deposit record
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Input
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g., BDO, BPI, Metrobank"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="Last 4 digits (optional)"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="depositDate">Deposit Date</Label>
                    <Input
                      id="depositDate"
                      type="date"
                      value={depositDate}
                      onChange={(e) => setDepositDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slipNumber">Deposit Slip Number</Label>
                    <Input
                      id="slipNumber"
                      value={slipNumber}
                      onChange={(e) => setSlipNumber(e.target.value)}
                      placeholder="Reference number"
                    />
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
                  <Button type="submit">Create & Add Items</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bank or slip..."
                value={query.search}
                onChange={(e) => {
                  onQueryChange({ ...query, search: e.target.value, page: 1 });
                }}
                className="flex-1"
              />
            </div>
            <Select value={query.sortBy} onValueChange={(value: BankDepositsQuery["sortBy"]) => onQueryChange({ ...query, sortBy: value, page: 1 })}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Sort by Date</SelectItem>
                <SelectItem value="amount">Sort by Amount</SelectItem>
              </SelectContent>
            </Select>
            <Select value={query.status} onValueChange={(value: BankDepositsQuery["status"]) => {
              onQueryChange({ ...query, status: value, page: 1 });
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="reconciled">Reconciled</SelectItem>
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
        <div className="space-y-4">
          {deposits.length === 0 ? (
            <div className="text-center text-muted-foreground py-8 border rounded-md">
              No bank deposits recorded yet
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {deposits.map((deposit) => {
                const items = depositItems[deposit.id] || [];
                return (
                  <AccordionItem key={deposit.id} value={deposit.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-4">
                          <div>
                            <div className="font-semibold">{deposit.bank_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(deposit.deposit_date), "MMMM dd, yyyy")}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getStatusBadge(deposit.status)}
                          <div className="font-semibold text-lg">
                            {formatCurrency(deposit.total_amount)}
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="pt-4 space-y-4">
                        {deposit.account_number && (
                          <div className="text-sm text-muted-foreground">
                            Account: {deposit.account_number}
                          </div>
                        )}
                        {deposit.deposit_slip_number && (
                          <div className="text-sm text-muted-foreground">
                            Slip #: {deposit.deposit_slip_number}
                          </div>
                        )}
                        {deposit.notes && (
                          <div className="text-sm">
                            <strong>Notes:</strong> {deposit.notes}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-sm">Deposit Breakdown</h4>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedDepositId(deposit.id);
                                setItemDialogOpen(true);
                              }}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Add Item
                            </Button>
                          </div>
                          {items.length === 0 ? (
                            <div className="text-sm text-muted-foreground text-center py-4 border rounded">
                              No items added yet
                            </div>
                          ) : (
                            <div className="border rounded-md">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Source</TableHead>
                                    <TableHead>Reference Date</TableHead>
                                    <TableHead>Amount</TableHead>
                                    <TableHead>Notes</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {items.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-medium">{item.source}</TableCell>
                                      <TableCell>
                                        {item.reference_date
                                          ? format(new Date(item.reference_date), "MMM dd, yyyy")
                                          : "-"}
                                      </TableCell>
                                      <TableCell>{formatCurrency(item.amount)}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {item.notes || "-"}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>

                        <div className="flex gap-2">
                          <Select
                            value={deposit.status}
                            onValueChange={(value) => onUpdateStatus(deposit.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="reconciled">Reconciled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}

          {totalCount > query.pageSize && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {totalCount === 0 ? 0 : (query.page - 1) * query.pageSize + 1} to {Math.min(query.page * query.pageSize, totalCount)} of {totalCount} deposits
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
        </div>

        {/* Deposit Item Dialog */}
        <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
          <DialogContent className="max-w-md">
            <form onSubmit={handleAddDepositItem}>
              <DialogHeader>
                <DialogTitle>Add Deposit Item</DialogTitle>
                <DialogDescription>
                  Add an item to this bank deposit
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="source">Source *</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger id="source">
                      <SelectValue placeholder="Select source" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Daily Sales">Daily Sales</SelectItem>
                      <SelectItem value="Receivable Payment">Receivable Payment</SelectItem>
                      <SelectItem value="Cash In">Cash In</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
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
                  <Label htmlFor="referenceDate">Reference Date</Label>
                  <Input
                    id="referenceDate"
                    type="date"
                    value={referenceDate}
                    onChange={(e) => setReferenceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="itemNotes">Notes</Label>
                  <Textarea
                    id="itemNotes"
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
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
                    setItemDialogOpen(false);
                    setSelectedDepositId(null);
                  }}
                >
                  Done
                </Button>
                <Button type="submit">Add Item</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
