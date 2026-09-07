import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { PlusCircle, Pencil, Trash2, Users } from "lucide-react";
import { type Employee, type CreateEmployeeData } from "@/hooks/useEmployees";

interface EmployeesManagerProps {
  employees: Employee[];
  onAdd: (data: CreateEmployeeData) => Promise<boolean>;
  onUpdate: (id: string, data: Partial<CreateEmployeeData>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

const emptyForm: CreateEmployeeData = {
  name: "",
  role: "",
  hourly_rate: null,
  pin: "",
  is_active: true,
};

const formatCurrency = (amount: number | null) =>
  amount == null
    ? "-"
    : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

export function EmployeesManager({ employees, onAdd, onUpdate, onDelete }: EmployeesManagerProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Employee | null>(null);
  const [form, setForm] = useState<CreateEmployeeData>(emptyForm);

  const openAdd = () => {
    setForm(emptyForm);
    setIsAddOpen(true);
  };

  const openEdit = (employee: Employee) => {
    setSelected(employee);
    setForm({
      name: employee.name,
      role: employee.role ?? "",
      hourly_rate: employee.hourly_rate,
      pin: "",
      is_active: employee.is_active,
    });
    setIsEditOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await onAdd(normalize(form));
    if (ok) setIsAddOpen(false);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const normalized = normalize(form);
    const updatePayload: Partial<CreateEmployeeData> = { ...normalized };

    // Keep existing PIN unless user explicitly enters a replacement value.
    if (!form.pin?.trim()) {
      delete updatePayload.pin;
    }

    const ok = await onUpdate(selected.id, updatePayload);
    if (ok) {
      setIsEditOpen(false);
      setSelected(null);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    const ok = await onDelete(selected.id);
    if (ok) {
      setDeleteOpen(false);
      setSelected(null);
    }
  };

  // Convert blank strings to null so optional columns stay clean.
  const normalize = (data: CreateEmployeeData): CreateEmployeeData => ({
    ...data,
    role: data.role?.trim() ? data.role.trim() : null,
    pin: data.pin?.trim() ? data.pin.trim() : null,
    hourly_rate: data.hourly_rate === null || Number.isNaN(data.hourly_rate) ? null : data.hourly_rate,
  });

  const fields = (idPrefix: string) => (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-name`}>Name *</Label>
        <Input
          id={`${idPrefix}-name`}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-role`}>Role</Label>
          <Input
            id={`${idPrefix}-role`}
            value={form.role ?? ""}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            placeholder="e.g. Cashier"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-rate`}>Hourly Rate</Label>
          <Input
            id={`${idPrefix}-rate`}
            type="number"
            step="0.01"
            min="0"
            value={form.hourly_rate ?? ""}
            onChange={(e) =>
              setForm({
                ...form,
                hourly_rate: e.target.value === "" ? null : parseFloat(e.target.value),
              })
            }
            placeholder="Optional"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-pin`}>PIN</Label>
          <Input
            id={`${idPrefix}-pin`}
            value={form.pin ?? ""}
            onChange={(e) => setForm({ ...form, pin: e.target.value })}
            placeholder={idPrefix === "edit" ? "Leave blank to keep current PIN" : "Optional, for Time Clock"}
            inputMode="numeric"
          />
        </div>
        <div className="flex items-center gap-2 pt-8">
          <Switch
            id={`${idPrefix}-active`}
            checked={form.is_active ?? true}
            onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
          />
          <Label htmlFor={`${idPrefix}-active`}>Active</Label>
        </div>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Employees
          </CardTitle>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={openAdd}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Employee
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={handleAdd}>
                <DialogHeader>
                  <DialogTitle>Add Employee</DialogTitle>
                  <DialogDescription>Add a team member for time-keeping.</DialogDescription>
                </DialogHeader>
                {fields("add")}
                <DialogFooter>
                  <Button type="submit">Add Employee</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Hourly Rate</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No employees yet. Add your first team member.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.name}</TableCell>
                    <TableCell>{employee.role || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(employee.hourly_rate)}
                    </TableCell>
                    <TableCell>{employee.has_pin ? "••••" : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={employee.is_active ? "default" : "secondary"}>
                        {employee.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(employee)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelected(employee);
                            setDeleteOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <form onSubmit={handleEdit}>
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>Update this team member's details.</DialogDescription>
            </DialogHeader>
            {fields("edit")}
            <DialogFooter>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove employee?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes {selected?.name} and all their time entries. To keep history,
              set them Inactive instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
