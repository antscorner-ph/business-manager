import React, { useState, useEffect } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Search, Package, ArrowRightLeft, RefreshCw, History, Loader2 } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  useConsignees, 
  useConsigneeProducts, 
  useProductsCatalog, 
  useConsignmentTransactions,
  type Consignee,
  type ConsignedProduct,
  type Product
} from "@/hooks/useConsignees";

export default function Consignees() {
  const { toast } = useToast();
  const { consignees, loading: loadingConsignees, addConsignee } = useConsignees();
  const [selectedConsignee, setSelectedConsignee] = useState<Consignee | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConsignees = consignees.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consignees</h1>
          <p className="text-muted-foreground">Manage your consigned product networks.</p>
        </div>
        <AddConsigneeDialog onConsigneeAdded={() => {}} addConsignee={addConsignee} toast={toast} />
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
                <TableHead>Address</TableHead>
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
                    <TableCell>{consignee.contact_person}</TableCell>
                    <TableCell>{consignee.phone}</TableCell>
                    <TableCell>{consignee.address}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setSelectedConsignee(consignee)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {selectedConsignee && (
        <ConsigneeDetails 
          consignee={selectedConsignee} 
          onClose={() => setSelectedConsignee(null)} 
        />
      )}
    </div>
  );
}

function ConsigneeDetails({ consignee, onClose }: { consignee: Consignee, onClose: () => void }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'products' | 'remit' | 'restock' | 'history'>('products');
  
  const { consignedProducts, loading: loadingProducts, addProductToConsignee, removeProduct } = useConsigneeProducts(consignee.id);
  const { products: catalog, loading: loadingCatalog } = useProductsCatalog();
  const { transactions, loading: loadingTx, recordTransaction } = useConsignmentTransactions(consignee.id);

  const calculateTotalValue = () => {
    return consignedProducts.reduce((sum, cp) => {
      const product = catalog.find(p => p.product_sku === cp.product_sku);
      return sum + (cp.quantity * (product?.unit_price || 0));
    }, 0);
  };

  return (
    <Card className="border-2 border-primary/20 shadow-lg">
      <CardHeader className="bg-muted/30 border-b">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">{consignee.name}</CardTitle>
            <p className="text-sm text-muted-foreground">Consignee Management</p>
          </div>
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex gap-2 mb-6">
          <Button 
            variant={activeTab === 'products' ? 'default' : 'outline'} 
            className="gap-2"
            onClick={() => setActiveTab('products')}
          >
            <Package className="w-4 h-4" /> Products
          </Button>
          <Button 
            variant={activeTab === 'remit' ? 'default' : 'outline'} 
            className="gap-2"
            onClick={() => setActiveTab('remit')}
          >
            <ArrowRightLeft className="w-4 h-4" /> Remit
          </Button>
          <Button 
            variant={activeTab === 'restock' ? 'default' : 'outline'} 
            className="gap-2"
            onClick={() => setActiveTab('restock')}
          >
            <RefreshCw className="w-4 h-4" /> Restock
          </Button>
          <Button 
            variant={activeTab === 'history' ? 'default' : 'outline'} 
            className="gap-2"
            onClick={() => setActiveTab('history')}
          >
            <History className="w-4 h-4" /> History
          </Button>
        </div>

        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Consigned Products</h3>
              <AddProductDialog 
                products={catalog} 
                onProductAdded={() => {
                  toast({ title: "Product Added", description: "Added to consignment." });
                }} 
                addProductToConsignee={addProductToConsignee}
              />
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-center">Stock</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingProducts || loadingCatalog ? (
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
                  consignedProducts.map((cp) => {
                    const product = catalog.find(p => p.product_sku === cp.product_sku);
                    return (
                      <TableRow key={cp.id}>
                        <TableCell className="font-medium">
                          {product?.name || cp.product_sku}
                        </TableCell>
                        <TableCell className="text-center">{cp.quantity}</TableCell>
                        <TableCell className="text-right">₱{product?.unit_price.toLocaleString()}</TableCell>
                        <TableCell className="text-right">₱{(cp.quantity * (product?.unit_price || 0)).toLocaleString()}</TableCell>
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
                                toast({ title: "Error", variant: "destructive", description: "Failed to remove product." });
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-bold">Total Value:</TableCell>
                  <TableCell className="text-right font-bold">₱{calculateTotalValue().toLocaleString()}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === 'remit' && (
          <RemitPanel 
            consignedProducts={consignedProducts} 
            catalog={catalog} 
            onRemit={async (items) => {
              try {
                await recordTransaction('REMITTANCE', items);
                toast({ title: "Remittance Recorded", description: "Sold quantities have been deducted." });
              } catch (e) {
                toast({ title: "Error", variant: "destructive", description: "Failed to record remittance." });
              }
            }} 
          />
        )}

        {activeTab === 'restock' && (
          <RestockPanel 
            consignedProducts={consignedProducts} 
            catalog={catalog} 
            onRestock={async (items) => {
              try {
                await recordTransaction('RESTOCK', items);
                toast({ title: "Restock Completed", description: "Inventory updated." });
              } catch (e) {
                toast({ title: "Error", variant: "destructive", description: "Failed to record restock." });
              }
            } } 
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
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTx ? (
                  <TableRow>
                  <TableCell colSpan={4} className="text-center py-10">
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10">No history available.</TableCell>
                  </TableRow>
                ) : (
                  transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{tx.transaction_date}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${tx.type === 'RESTOCK' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                          {tx.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm">
                        {tx.consignment_transaction_items?.map((item: any) => (
                          <div key={item.id} className="text-xs">
                            {item.products?.name || item.product_sku} x {item.quantity}
                          </div>
                        ))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₱{tx.consignment_transaction_items?.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0).toLocaleString()}
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

function AddProductDialog({ products, onProductAdded, addProductToConsignee }: { 
  products: Product[], 
  onProductAdded: () => void,
  addProductToConsignee: (sku: string, qty: number) => Promise<void>
}) {
  const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const handleAdd = async () => {
    try {
      const promises = selectedSkus.map(sku => addProductToConsignee(sku, quantities[sku] || 0));
      await Promise.all(promises);
      setSelectedSkus([]);
      setQuantities({});
      onProductAdded();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Products
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Consigned Products</DialogTitle>
          <DialogDescription>Select products to add to this consignee.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="max-h-48 overflow-y-auto space-y-2 border rounded-md p-2">
            {products.map(p => (
              <div key={p.product_sku} className="flex items-center gap-2 p-1 hover:bg-muted rounded">
                <input 
                  type="checkbox" 
                  id={p.product_sku} 
                  className="rounded"
                  checked={selectedSkus.includes(p.product_sku)}
                  onChange={() => {
                    const next = selectedSkus.includes(p.product_sku) 
                      ? selectedSkus.filter(s => s !== p.product_sku) 
                      : [...selectedSkus, p.product_sku];
                    setSelectedSkus(next);
                  }}
                />
                <label htmlFor={p.product_sku} className="text-sm cursor-pointer flex-1">
                  {p.name} <span className="text-muted-foreground text-xs">({p.product_sku})</span>
                </label>
              </div>
            ))}
          </div>
          {selectedSkus.length > 0 && (
            <div className="space-y-3">
              <div className="text-sm font-medium">Set Quantities</div>
              {selectedSkus.map(sku => (
                <div key={sku} className="flex items-center justify-between gap-4">
                  <span className="text-sm">{products.find(p => p.product_sku === sku)?.name}</span>
                  <Input 
                    type="number" 
                    className="w-20 h-8 text-center" 
                    onChange={(e) => setQuantities(prev => ({ ...prev, [sku]: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => {}}>Cancel</Button>
          <Button onClick={handleAdd} disabled={selectedSkus.length === 0}>Add Selected</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemitPanel({ consignedProducts, catalog, onRemit }: { 
  consignedProducts: ConsignedProduct[], 
  catalog: Product[], 
  onRemit: (items: { sku: string, qty: number, price: number }[]) => Promise<void> 
}) {
  const [soldQuantities, setSoldQuantities] = useState<Record<string, number>>({});
  
  const itemsToRemit = Object.entries(soldQuantities).map(([id, qty]) => {
    const cp = consignedProducts.find(p => p.id === id);
    const product = catalog.find(p => p.product_sku === cp?.product_sku);
    return { sku: cp?.product_sku || '', qty, price: product?.unit_price || 0 };
  }).filter(i => i.qty > 0 && i.sku);

  const totalRemittance = itemsToRemit.reduce((sum, i) => sum + (i.qty * i.price), 0);

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
        {consignedProducts.map(cp => {
          const product = catalog.find(p => p.product_sku === cp.product_sku);
          const sold = soldQuantities[cp.id] || 0;
          return (
            <div key={cp.id} className="grid grid-cols-4 gap-4 items-center py-2 border-b last:border-0">
              <div className="text-sm">{product?.name}</div>
              <div className="text-center text-sm">{cp.quantity}</div>
              <div className="flex justify-center">
                <Input 
                  type="number" 
                  className="w-16 h-8 text-center" 
                  value={sold}
                  onChange={(e) => setSoldQuantities(prev => ({ ...prev, [cp.id]: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="text-right text-sm font-medium">
                ₱{(sold * (product?.unit_price || 0)).toLocaleString()}
              </div>
            </div>
          );
        })}
        <div className="flex justify-end pt-4">
          <div className="text-right space-y-1">
            <div className="text-sm text-muted-foreground">Total Remittance:</div>
            <div className="text-2xl font-bold">₱{totalRemittance.toLocaleString()}</div>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button 
          onClick={async () => {
            await onRemit(itemsToRemit);
          }}
          disabled={itemsToRemit.length === 0}
        >
          Confirm Remittance
        </Button>
      </div>
    </div>
  );
}

function RestockPanel({ consignedProducts, catalog, onRestock }: { 
  consignedProducts: ConsignedProduct[], 
  catalog: Product[], 
  onRestock: (items: { sku: string, qty: number, price: number }[]) => Promise<void> 
}) {
  const [addQuantities, setAddQuantities] = useState<Record<string, number>>({});
  
  const itemsToRestock = consignedProducts
    .filter(cp => (addQuantities[cp.id] || 0) > 0)
    .map(cp => {
      const product = catalog.find(p => p.product_sku === cp.product_sku);
      return { 
        sku: cp.product_sku, 
        qty: addQuantities[cp.id] || 0, 
        price: product?.unit_price || 0 
      };
    });

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Restock Products</h3>
      <div className="border rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-3 gap-4 pb-2 border-b text-sm font-medium">
          <div>Product</div>
          <div className="text-center">Current</div>
          <div className="text-center">Add Qty</div>
        </div>
        {consignedProducts.map(cp => {
          const product = catalog.find(p => p.product_sku === cp.product_sku);
          return (
            <div key={cp.id} className="grid grid-cols-3 gap-4 items-center py-2 border-b last:border-0">
              <div className="text-sm">{product?.name}</div>
              <div className="text-center text-sm">{cp.quantity}</div>
              <div className="flex justify-center">
                <Input 
                  type="number" 
                  className="w-24 h-8 text-center" 
                  value={addQuantities[cp.id] || 0}
                  onChange={(e) => setAddQuantities(prev => ({ ...prev, [cp.id]: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline">Cancel</Button>
        <Button 
          onClick={async () => {
            await onRestock(itemsToRestock);
          }}
          disabled={itemsToRestock.length === 0}
        >
          Confirm Restock
        </Button>
      </div>
    </div>
  );
}

function AddConsigneeDialog({ onConsigneeAdded, addConsignee, toast }: { 
  onConsigneeAdded: () => void,
  addConsignee: (c: any) => Promise<any>,
  toast: any
}) {
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    address: ''
  });

  const handleSave = async () => {
    try {
      await addConsignee(formData);
      toast({ title: "Consignee Added", description: "Store added successfully." });
      onConsigneeAdded();
    } catch (e) {
      toast({ title: "Error", variant: "destructive", description: "Failed to add consignee." });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Add Consignee
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Consignee</DialogTitle>
          <DialogDescription>Add a new consignment store to the system.</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Input 
            placeholder="Store Name" 
            value={formData.name}
            onChange={e => setFormData(p => ({...p, name: e.target.value}))}
          />
          <Input 
            placeholder="Contact Person" 
            value={formData.contact_person}
            onChange={e => setFormData(p => ({...p, contact_person: e.target.value}))}
          />
          <Input 
            placeholder="Phone" 
            value={formData.phone}
            onChange={e => setFormData(p => ({...p, phone: e.target.value}))}
          />
          <Input 
            placeholder="Address" 
            value={formData.address}
            onChange={e => setFormData(p => ({...p, address: e.target.value}))}
          />
        </div>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button onClick={handleSave} disabled={!formData.name}>Save Consignee</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
