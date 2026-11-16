import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Package, ArrowRightLeft, RefreshCw, History, Loader2, Pencil } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  useConsignees,
  useConsigneeProducts,
  useProductNames,
  useProductsPage,
  useProductCategories,
  useConsignmentTransactions,
  type Consignee,
  type ConsignedProduct,
  type Product,
} from "@/hooks/useConsignees";

const peso = (value: number | null | undefined) =>
  `₱${Number(value ?? 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function Consignees() {
  const { toast } = useToast();
  const { consignees, loading: loadingConsignees, addConsignee, updateConsignee } = useConsignees();
  const [selectedConsignee, setSelectedConsignee] = useState<Consignee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConsignees = consignees.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Keep the selected consignee in sync with the latest list (e.g. after edit).
  const activeSelected = selectedConsignee
    ? consignees.find((c) => c.id === selectedConsignee.id) ?? null
    : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consignees</h1>
          <p className="text-muted-foreground">Manage your consigned product networks.</p>
        </div>
        <ConsigneeFormDialog
          mode="add"
          onSubmit={async (values) => {
            await addConsignee(values);
            toast({ title: "Consignee Added", description: "Store added successfully." });
          }}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search consignees..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact Person</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-center">Commission</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingConsignees ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">
                    <div className="flex justify-center items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading consignees...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredConsignees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-10">No consignees found.</TableCell>
                </TableRow>
              ) : (
                filteredConsignees.map((consignee) => (
                  <TableRow key={consignee.id}>
                    <TableCell className="font-medium">{consignee.name}</TableCell>
                    <TableCell>{consignee.contact_person || '—'}</TableCell>
                    <TableCell>{consignee.phone || '—'}</TableCell>
                    <TableCell className="text-center">
                      {(Number(consignee.commission_rate) * 100).toFixed(0)}%
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <ConsigneeFormDialog
                          mode="edit"
                          initial={consignee}
                          onSubmit={async (values) => {
                            await updateConsignee(consignee.id, values);
                            toast({ title: "Consignee Updated", description: "Changes saved." });
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedConsignee(consignee)}
                        >
                          Manage
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {activeSelected && (
        <ConsigneeDetails
          consignee={activeSelected}
          onClose={() => setSelectedConsignee(null)}
        />
      )}
    </div>
  );
}

function ConsigneeDetails({ consignee, onClose }: { consignee: Consignee; onClose: () => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'products' | 'remit' | 'restock' | 'history'>('products');

  const { consignedProducts, loading: loadingProducts, addProductToConsignee, removeProduct, fetchProducts } =
    useConsigneeProducts(consignee.id);
  const {
    transactions,
    loading: loadingTx,
    recordTransaction,
    recordPayment,
    outstandingBalance,
    fetchTransactions,
  } = useConsignmentTransactions(consignee.id);

  // Consigned stock valuation uses the snapshot price on each placement.
  const totalValue = consignedProducts.reduce(
    (sum, cp) => sum + cp.quantity * Number(cp.unit_price),
    0
  );

  const productName = useProductNames(consignedProducts.map((cp) => cp.product_sku));

  const handleError = (e: unknown, fallback: string) => {
    const message = e instanceof Error ? e.message : fallback;
    toast({ title: "Error", variant: "destructive", description: message });
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="bg-muted/30 border-b">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{consignee.name}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Consignee Management · {(Number(consignee.commission_rate) * 100).toFixed(0)}% commission
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Outstanding Balance</div>
            <div className={`text-xl font-bold ${outstandingBalance > 0 ? 'text-destructive' : ''}`}>
              {peso(outstandingBalance)}
            </div>
            <Button variant="ghost" size="sm" className="mt-1" onClick={onClose}>Close</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex gap-2 mb-6">
          <Button variant={activeTab === 'products' ? 'default' : 'outline'} className="gap-2" onClick={() => setActiveTab('products')}>
            <Package className="w-4 h-4" /> Products
          </Button>
          <Button variant={activeTab === 'remit' ? 'default' : 'outline'} className="gap-2" onClick={() => setActiveTab('remit')}>
            <ArrowRightLeft className="w-4 h-4" /> Remit
          </Button>
          <Button variant={activeTab === 'restock' ? 'default' : 'outline'} className="gap-2" onClick={() => setActiveTab('restock')}>
            <RefreshCw className="w-4 h-4" /> Restock
          </Button>
          <Button variant={activeTab === 'history' ? 'default' : 'outline'} className="gap-2" onClick={() => setActiveTab('history')}>
            <History className="w-4 h-4" /> History
          </Button>
        </div>

        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Consigned Products</h3>
              <AddProductDialog
                existingSkus={consignedProducts.map((cp) => cp.product_sku)}
                onAdd={async (sku, qty) => {
                  await addProductToConsignee(sku, qty);
                }}
                onDone={() => toast({ title: "Product Added", description: "Added to consignment." })}
                onError={(e) => handleError(e, "Failed to add product.")}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProducts ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : consignedProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10">No products consigned.</TableCell>
                  </TableRow>
                ) : (
                  consignedProducts.map((cp) => (
                    <TableRow key={cp.id}>
                      <TableCell className="font-medium">{productName(cp.product_sku)}</TableCell>
                      <TableCell className="text-center">{cp.quantity}</TableCell>
                      <TableCell className="text-right">{peso(cp.unit_price)}</TableCell>
                      <TableCell className="text-right">{peso(cp.quantity * Number(cp.unit_price))}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={async () => {
                            try {
                              await removeProduct(cp.id);
                              toast({ title: "Product Removed", description: "Product marked as inactive." });
                            } catch (e) {
                              handleError(e, "Failed to remove product.");
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
                {consignedProducts.length > 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-right font-bold">Total Value:</TableCell>
                    <TableCell className="text-right font-bold">{peso(totalValue)}</TableCell>
                    <TableCell />
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'remit' && (
          <RemitPanel
            consignedProducts={consignedProducts}
            productName={productName}
            onRemit={async (items) => {
              try {
                await recordTransaction('REMITTANCE', items);
                await fetchProducts();
                toast({ title: "Remittance Recorded", description: "Sold quantities deducted; balance updated." });
                setActiveTab('history');
              } catch (e) {
                handleError(e, "Failed to record remittance.");
              }
            }}
          />
        )}

        {activeTab === 'restock' && (
          <RestockPanel
            consignedProducts={consignedProducts}
            productName={productName}
            onRestock={async (items) => {
              try {
                await recordTransaction('RESTOCK', items);
                await fetchProducts();
                toast({ title: "Restock Completed", description: "Inventory updated." });
                setActiveTab('products');
              } catch (e) {
                handleError(e, "Failed to record restock.");
              }
            }}
          />
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Transaction History</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTx ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10">No history available.</TableCell>
                  </TableRow>
                ) : (
                  transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.transaction_date}</TableCell>
                      <TableCell>
                        <Badge variant={tx.type === 'RESTOCK' ? 'secondary' : 'default'}>{tx.type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.consignment_transaction_items?.map((item) => (
                          <div key={item.id} className="text-xs">
                            {item.products?.name || item.product_sku} × {item.quantity}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {tx.type === 'REMITTANCE' ? peso(tx.amount_due) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.type === 'REMITTANCE' ? (
                          <Badge variant={tx.payment_status === 'paid' ? 'secondary' : 'outline'}>
                            {peso(tx.balance)}
                          </Badge>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {tx.type === 'REMITTANCE' && Number(tx.balance) > 0 && (
                          <RecordPaymentDialog
                            balance={Number(tx.balance)}
                            onPay={async (amount, method) => {
                              await recordPayment(tx.id, amount, method);
                            }}
                            onDone={() => toast({ title: "Payment Recorded", description: "Balance updated." })}
                            onError={(e) => handleError(e, "Failed to record payment.")}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const PICKER_PAGE_SIZE = 25;

function AddProductDialog({
  existingSkus,
  onAdd,
  onDone,
  onError,
}: {
  existingSkus: string[];
  onAdd: (sku: string, qty: number) => Promise<void>;
  onDone: () => void;
  onError: (e: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  // Selections are kept as full rows so they survive paging and filter changes.
  const [selected, setSelected] = useState<Record<string, Product>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);

  const categories = useProductCategories(open);
  const { products: rows, totalCount, loading } = useProductsPage(
    {
      page,
      pageSize: PICKER_PAGE_SIZE,
      search: debouncedSearch,
      category,
      inStockOnly,
      excludeSkus: existingSkus,
    },
    open
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PICKER_PAGE_SIZE));
  const selectedList = Object.values(selected);
  const validSelections = selectedList.filter((p) => (quantities[p.sku] || 0) > 0);
  const allRowsSelected = rows.length > 0 && rows.every((p) => selected[p.sku]);
  const hasFilters = search !== '' || category !== 'all' || inStockOnly;

  const toggle = (p: Product) =>
    setSelected((prev) => {
      const next = { ...prev };
      if (next[p.sku]) delete next[p.sku];
      else next[p.sku] = p;
      return next;
    });

  const togglePage = () =>
    setSelected((prev) => {
      const next = { ...prev };
      if (allRowsSelected) rows.forEach((p) => delete next[p.sku]);
      else rows.forEach((p) => (next[p.sku] = p));
      return next;
    });

  const clearFilters = () => {
    setSearch('');
    setCategory('all');
    setInStockOnly(false);
    setPage(1);
  };

  const reset = () => {
    setSelected({});
    setQuantities({});
    clearFilters();
  };

  const handleAdd = async () => {
    setSubmitting(true);
    try {
      for (const p of validSelections) {
        await onAdd(p.sku, quantities[p.sku]);
      }
      reset();
      setOpen(false);
      onDone();
    } catch (e) {
      onError(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Products
        </Button>
      </DialogTrigger>
      <DialogContent className="flex flex-col w-[95vw] max-w-6xl h-[90vh] gap-4">
        <DialogHeader>
          <DialogTitle>Add Consigned Products</DialogTitle>
          <DialogDescription>
            Search and filter the catalog, select products across pages, then set quantities.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 min-h-0 flex-col gap-4 lg:flex-row">
          {/* Catalog */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, SKU or category..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <select
                aria-label="Filter by category"
                className="h-9 max-w-[220px] rounded-md border bg-background px-3 text-sm"
                value={category}
                onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              >
                <option value="all">All categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded"
                  checked={inStockOnly}
                  onChange={(e) => { setInStockOnly(e.target.checked); setPage(1); }}
                />
                In stock only
              </label>
              {hasFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 bg-background">
                  <TableRow>
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        aria-label="Select all on this page"
                        className="rounded"
                        checked={allRowsSelected}
                        disabled={rows.length === 0}
                        onChange={togglePage}
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                        {hasFilters ? 'No products match your search or filters.' : 'No products available to add.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((p) => {
                      const stock = Number(p.qty ?? 0);
                      return (
                        <TableRow
                          key={p.sku}
                          className="cursor-pointer"
                          data-state={selected[p.sku] ? 'selected' : undefined}
                          onClick={() => toggle(p)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${p.name || p.sku}`}
                              className="rounded"
                              checked={!!selected[p.sku]}
                              onChange={() => toggle(p)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{p.name || p.sku}</div>
                            <div className="text-xs text-muted-foreground">{p.sku}</div>
                          </TableCell>
                          <TableCell className="text-sm">{p.category || '—'}</TableCell>
                          <TableCell className="text-right">{peso(p.price)}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={stock > 0 ? 'secondary' : 'outline'}>
                              {stock > 0 ? stock : 'Out'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{totalCount.toLocaleString()} products</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((n) => n - 1)}
                >
                  Previous
                </Button>
                <span>Page {page} of {totalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((n) => n + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>

          {/* Selection */}
          <div className="flex max-h-[11rem] min-h-0 w-full shrink-0 flex-col gap-3 rounded-md border p-3 lg:max-h-none lg:w-80">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">Selected ({selectedList.length})</div>
              {selectedList.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSelected({}); setQuantities({}); }}
                >
                  Clear
                </Button>
              )}
            </div>
            <div className="flex-1 min-h-0 space-y-2 overflow-y-auto pr-1">
              {selectedList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Tick products on the left. Your selection is kept while you search and change pages.
                </p>
              ) : (
                selectedList.map((p) => (
                  <div key={p.sku} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm">{p.name || p.sku}</div>
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-destructive"
                        onClick={() => toggle(p)}
                      >
                        Remove
                      </button>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Qty"
                      aria-label={`Quantity for ${p.name || p.sku}`}
                      className="h-8 w-20 shrink-0 text-center"
                      value={quantities[p.sku] || ''}
                      onChange={(e) =>
                        setQuantities((prev) => ({ ...prev, [p.sku]: Math.max(0, parseInt(e.target.value) || 0) }))
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleAdd} disabled={validSelections.length === 0 || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add Selected{validSelections.length > 0 ? ` (${validSelections.length})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemitPanel({
  consignedProducts,
  productName,
  onRemit,
}: {
  consignedProducts: ConsignedProduct[];
  productName: (sku: string) => string;
  onRemit: (items: { sku: string; qty: number }[]) => Promise<void>;
}) {
  const [soldQuantities, setSoldQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const itemsToRemit = consignedProducts
    .map((cp) => ({ cp, qty: soldQuantities[cp.id] || 0 }))
    .filter(({ qty }) => qty > 0)
    .map(({ cp, qty }) => ({ sku: cp.product_sku, qty }));

  const totalRemittance = consignedProducts.reduce((sum, cp) => {
    const sold = soldQuantities[cp.id] || 0;
    return sum + sold * Number(cp.unit_price);
  }, 0);

  const hasOverflow = consignedProducts.some((cp) => (soldQuantities[cp.id] || 0) > cp.quantity);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Remittance</h3>
      <div className="border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-4 gap-4 pb-2 border-b text-sm font-medium">
          <div>Product</div>
          <div className="text-center">Available</div>
          <div className="text-center">Sold</div>
          <div className="text-right">Subtotal</div>
        </div>
        {consignedProducts.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">No products to remit.</p>
        )}
        {consignedProducts.map((cp) => {
          const sold = soldQuantities[cp.id] || 0;
          const over = sold > cp.quantity;
          return (
            <div key={cp.id} className="grid grid-cols-4 gap-4 items-center py-2 border-b last:border-0">
              <div className="text-sm">{productName(cp.product_sku)}</div>
              <div className="text-center text-sm">{cp.quantity}</div>
              <div className="flex justify-center">
                <Input
                  type="number"
                  min={0}
                  max={cp.quantity}
                  className={`w-16 h-8 text-center ${over ? 'border-destructive' : ''}`}
                  value={soldQuantities[cp.id] || ''}
                  onChange={(e) =>
                    setSoldQuantities((prev) => ({
                      ...prev,
                      [cp.id]: Math.max(0, parseInt(e.target.value) || 0),
                    }))
                  }
                />
              </div>
              <div className="text-right text-sm font-medium">{peso(sold * Number(cp.unit_price))}</div>
            </div>
          );
        })}
        <div className="flex justify-end pt-4">
          <div className="text-right space-y-1">
            <div className="text-sm text-muted-foreground">Total Remittance:</div>
            <div className="text-2xl font-bold">{peso(totalRemittance)}</div>
          </div>
        </div>
      </div>
      {hasOverflow && (
        <p className="text-sm text-destructive text-right">Sold quantity cannot exceed available stock.</p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setSoldQuantities({})}>Clear</Button>
        <Button
          onClick={async () => {
            setSubmitting(true);
            try {
              await onRemit(itemsToRemit);
              setSoldQuantities({});
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={itemsToRemit.length === 0 || hasOverflow || submitting}
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Confirm Remittance
        </Button>
      </div>
    </div>
  );
}

function RestockPanel({
  consignedProducts,
  productName,
  onRestock,
}: {
  consignedProducts: ConsignedProduct[];
  productName: (sku: string) => string;
  onRestock: (items: { sku: string; qty: number }[]) => Promise<void>;
}) {
  const [addQuantities, setAddQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  const itemsToRestock = consignedProducts
    .filter((cp) => (addQuantities[cp.id] || 0) > 0)
    .map((cp) => ({ sku: cp.product_sku, qty: addQuantities[cp.id] }));

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Restock Products</h3>
      <div className="border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4 pb-2 border-b text-sm font-medium">
          <div>Product</div>
          <div className="text-center">Current</div>
          <div className="text-center">Add Qty</div>
        </div>
        {consignedProducts.length === 0 && (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No products yet. Use the Products tab to place products first.
          </p>
        )}
        {consignedProducts.map((cp) => (
          <div key={cp.id} className="grid grid-cols-3 gap-4 items-center py-2 border-b last:border-0">
            <div className="text-sm">{productName(cp.product_sku)}</div>
            <div className="text-center text-sm">{cp.quantity}</div>
            <div className="flex justify-center">
              <Input
                type="number"
                min={0}
                className="w-24 h-8 text-center"
                value={addQuantities[cp.id] || ''}
                onChange={(e) =>
                  setAddQuantities((prev) => ({
                    ...prev,
                    [cp.id]: Math.max(0, parseInt(e.target.value) || 0),
                  }))
                }
              />
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setAddQuantities({})}>Clear</Button>
        <Button
          onClick={async () => {
            setSubmitting(true);
            try {
              await onRestock(itemsToRestock);
              setAddQuantities({});
            } finally {
              setSubmitting(false);
            }
          }}
          disabled={itemsToRestock.length === 0 || submitting}
        >
          {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Confirm Restock
        </Button>
      </div>
    </div>
  );
}

function RecordPaymentDialog({
  balance,
  onPay,
  onDone,
  onError,
}: {
  balance: number;
  onPay: (amount: number, method: string) => Promise<void>;
  onDone: () => void;
  onError: (e: unknown) => void;
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  const numeric = parseFloat(amount) || 0;
  const invalid = numeric <= 0 || numeric > balance;

  const handlePay = async () => {
    setSubmitting(true);
    try {
      await onPay(numeric, method);
      setOpen(false);
      setAmount('');
      onDone();
    } catch (e) {
      onError(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setAmount(''); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Record Payment</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Outstanding balance: {peso(balance)}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="pay-amount">Amount</Label>
            <Input
              id="pay-amount"
              type="number"
              min={0}
              max={balance}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {numeric > balance && (
              <p className="text-xs text-destructive">Amount cannot exceed the balance.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pay-method">Method</Label>
            <select
              id="pay-method"
              className="w-full h-9 rounded-md border bg-background px-3 text-sm"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            >
              <option value="cash">Cash</option>
              <option value="gcash">GCash</option>
              <option value="check">Check</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handlePay} disabled={invalid || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type ConsigneeFormValues = {
  name: string;
  contact_person: string;
  phone: string;
  address: string;
  commission_rate: number;
};

function ConsigneeFormDialog({
  mode,
  initial,
  onSubmit,
}: {
  mode: 'add' | 'edit';
  initial?: Consignee;
  onSubmit: (values: ConsigneeFormValues) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<ConsigneeFormValues>({
    name: initial?.name || '',
    contact_person: initial?.contact_person || '',
    phone: initial?.phone || '',
    address: initial?.address || '',
    commission_rate: initial ? Number(initial.commission_rate) * 100 : 0,
  });

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        commission_rate: Math.min(Math.max(formData.commission_rate, 0), 100) / 100,
      });
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {mode === 'add' ? (
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add Consignee
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="gap-1">
            <Pencil className="w-3.5 h-3.5" /> Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Consignee' : 'Edit Consignee'}</DialogTitle>
          <DialogDescription>
            {mode === 'add' ? 'Add a new consignment store to the system.' : 'Update consignee details.'}
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="c-name">Store Name</Label>
            <Input
              id="c-name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-contact">Contact Person</Label>
            <Input
              id="c-contact"
              value={formData.contact_person}
              onChange={(e) => setFormData((p) => ({ ...p, contact_person: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-phone">Phone</Label>
            <Input
              id="c-phone"
              value={formData.phone}
              onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-address">Address</Label>
            <Input
              id="c-address"
              value={formData.address}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="c-commission">Commission Rate (%)</Label>
            <Input
              id="c-commission"
              type="number"
              min={0}
              max={100}
              step="0.5"
              value={formData.commission_rate}
              onChange={(e) =>
                setFormData((p) => ({ ...p, commission_rate: parseFloat(e.target.value) || 0 }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Percentage the consignee keeps per sale. 0% means they remit the full sold value.
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={!formData.name.trim() || submitting}>
            {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'add' ? 'Save Consignee' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
