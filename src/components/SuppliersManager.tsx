import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Pencil, Trash2, Search } from "lucide-react";
import { Supplier, CreateSupplierData, SuppliersQuery } from "@/hooks/useSuppliers";

interface SuppliersManagerProps {
  suppliers: Supplier[];
  totalCount: number;
  query: SuppliersQuery;
  onQueryChange: (query: SuppliersQuery) => void;
  onAddSupplier: (data: CreateSupplierData) => Promise<void>;
  onUpdateSupplier: (id: string, data: Partial<CreateSupplierData>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export const SuppliersManager = ({
  suppliers,
  totalCount,
  query,
  onQueryChange,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
}: SuppliersManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<CreateSupplierData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    contact_person: "",
    payment_terms: "",
    notes: "",
  });

  const handleAddSupplier = async () => {
    if (!formData.name.trim()) {
      alert("Please enter a supplier name");
      return;
    }
    await onAddSupplier(formData);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postal_code: "",
      contact_person: "",
      payment_terms: "",
      notes: "",
    });
    setIsAddDialogOpen(false);
  };

  const handleUpdateSupplier = async () => {
    if (!editingSupplier) return;
    if (!formData.name.trim()) {
      alert("Please enter a supplier name");
      return;
    }
    await onUpdateSupplier(editingSupplier.id, formData);
    setEditingSupplier(null);
    setIsEditDialogOpen(false);
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      email: supplier.email || "",
      phone: supplier.phone || "",
      address: supplier.address || "",
      city: supplier.city || "",
      postal_code: supplier.postal_code || "",
      contact_person: supplier.contact_person || "",
      payment_terms: supplier.payment_terms || "",
      notes: supplier.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleClearFilters = () => {
    onQueryChange({ ...query, search: "", page: 1 });
  };

  const startIndex = (query.page - 1) * query.pageSize + 1;
  const endIndex = Math.min(query.page * query.pageSize, totalCount);
  const totalPages = Math.ceil(totalCount / query.pageSize);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>Suppliers</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Supplier
                  </Button>
                </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Supplier Name *"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
              <Input
                placeholder="Email"
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
              <Input
                placeholder="Phone"
                value={formData.phone || ""}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
              <Input
                placeholder="Address"
                value={formData.address || ""}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
              <Input
                placeholder="City"
                value={formData.city || ""}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
              />
              <Input
                placeholder="Postal Code"
                value={formData.postal_code || ""}
                onChange={(e) =>
                  setFormData({ ...formData, postal_code: e.target.value })
                }
              />
              <Input
                placeholder="Contact Person"
                value={formData.contact_person || ""}
                onChange={(e) =>
                  setFormData({ ...formData, contact_person: e.target.value })
                }
              />
              <Input
                placeholder="Payment Terms"
                value={formData.payment_terms || ""}
                onChange={(e) =>
                  setFormData({ ...formData, payment_terms: e.target.value })
                }
              />
              <Input
                placeholder="Notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
              <Button onClick={handleAddSupplier} className="w-full">
                Add Supplier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
            </div>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={query.search}
                  onChange={(e) =>
                    onQueryChange({ ...query, search: e.target.value, page: 1 })
                  }
                  className="flex-1"
                />
              </div>
              <Select value={query.sortBy} onValueChange={(value: "name" | "date") =>
                onQueryChange({ ...query, sortBy: value })
              }>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name A-Z</SelectItem>
                  <SelectItem value="date">Newest First</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleClearFilters} className="md:col-span-2">
                Clear Filters
              </Button>
            </div>
          </div>
        </CardHeader>

      {/* Edit Supplier Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Supplier Name *"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.email || ""}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <Input
              placeholder="Phone"
              value={formData.phone || ""}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <Input
              placeholder="Address"
              value={formData.address || ""}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
            <Input
              placeholder="City"
              value={formData.city || ""}
              onChange={(e) =>
                setFormData({ ...formData, city: e.target.value })
              }
            />
            <Input
              placeholder="Postal Code"
              value={formData.postal_code || ""}
              onChange={(e) =>
                setFormData({ ...formData, postal_code: e.target.value })
              }
            />
            <Input
              placeholder="Contact Person"
              value={formData.contact_person || ""}
              onChange={(e) =>
                setFormData({ ...formData, contact_person: e.target.value })
              }
            />
            <Input
              placeholder="Payment Terms"
              value={formData.payment_terms || ""}
              onChange={(e) =>
                setFormData({ ...formData, payment_terms: e.target.value })
              }
            />
            <Input
              placeholder="Notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
            <Button onClick={handleUpdateSupplier} className="w-full">
              Update Supplier
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        <CardContent>
          <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Payment Terms</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No suppliers found. Add your first supplier to get started.
                </TableCell>
              </TableRow>
            ) : (
              suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.email || "—"}</TableCell>
                <TableCell>{supplier.phone || "—"}</TableCell>
                <TableCell>{supplier.city || "—"}</TableCell>
                <TableCell>{supplier.payment_terms || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(supplier)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {supplier.name}? This
                        action cannot be undone.
                      </AlertDialogDescription>
                      <div className="flex justify-end gap-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteSupplier(supplier.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                    </AlertDialog>
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
              Showing {startIndex} to {endIndex} of {totalCount} suppliers
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onQueryChange({ ...query, page: Math.max(1, query.page - 1) })
                }
                disabled={query.page === 1}
              >
                Previous
              </Button>
              <div className="text-sm">
                Page {query.page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onQueryChange({
                    ...query,
                    page: Math.min(totalPages, query.page + 1),
                  })
                }
                disabled={query.page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
