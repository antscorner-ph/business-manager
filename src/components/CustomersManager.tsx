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
import { Badge } from "@/components/ui/badge";
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
import { Customer, CreateCustomerData, CustomersQuery } from "@/hooks/useCustomers";

interface CustomersManagerProps {
  customers: Customer[];
  totalCount: number;
  query: CustomersQuery;
  onQueryChange: (query: CustomersQuery) => void;
  onAddCustomer: (data: CreateCustomerData) => Promise<void>;
  onUpdateCustomer: (id: string, data: Partial<CreateCustomerData>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
}

export const CustomersManager = ({
  customers,
  totalCount,
  query,
  onQueryChange,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
}: CustomersManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CreateCustomerData>({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postal_code: "",
    contact_person: "",
    notes: "",
  });

  const handleAddCustomer = async () => {
    if (!formData.name.trim()) {
      alert("Please enter a customer name");
      return;
    }
    await onAddCustomer(formData);
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      city: "",
      postal_code: "",
      contact_person: "",
      notes: "",
    });
    setIsAddDialogOpen(false);
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    if (!formData.name.trim()) {
      alert("Please enter a customer name");
      return;
    }
    await onUpdateCustomer(editingCustomer.id, formData);
    setEditingCustomer(null);
    setIsEditDialogOpen(false);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      city: customer.city || "",
      postal_code: customer.postal_code || "",
      contact_person: customer.contact_person || "",
      notes: customer.notes || "",
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
              <CardTitle>Customers</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Customer
                  </Button>
                </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Customer Name *"
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
                placeholder="Notes"
                value={formData.notes || ""}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
              />
              <Button onClick={handleAddCustomer} className="w-full">
                Add Customer
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

      {/* Edit Customer Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Customer Name *"
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
              placeholder="Notes"
              value={formData.notes || ""}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
            <Button onClick={handleUpdateCustomer} className="w-full">
              Update Customer
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
              <TableHead>Contact Person</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No customers found. Add your first customer to get started.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell className="font-medium">{customer.name}</TableCell>
                <TableCell>{customer.email || "—"}</TableCell>
                <TableCell>{customer.phone || "—"}</TableCell>
                <TableCell>{customer.city || "—"}</TableCell>
                <TableCell>{customer.contact_person || "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(customer)}
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
                      <AlertDialogTitle>Delete Customer</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete {customer.name}? This
                        action cannot be undone.
                      </AlertDialogDescription>
                      <div className="flex justify-end gap-2">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteCustomer(customer.id)}
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
              Showing {startIndex} to {endIndex} of {totalCount} customers
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
