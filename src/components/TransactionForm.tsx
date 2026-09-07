import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";

export interface Transaction {
  id: string;
  type: "cash_in" | "cash_out";
  category: string;
  description: string;
  amount: number;
  timestamp: Date;
}

interface TransactionFormProps {
  onAddTransaction: (transaction: Omit<Transaction, "id" | "timestamp">) => void;
}

const cashInCategories = ["Sales", "Refund Received", "Loan", "Other Income"];
const cashOutCategories = ["Supplies", "Refund Given", "Wages", "Utilities", "Other Expense"];

export function TransactionForm({ onAddTransaction }: TransactionFormProps) {
  const [type, setType] = useState<"cash_in" | "cash_out">("cash_in");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");

  const categories = type === "cash_in" ? cashInCategories : cashOutCategories;

  const validateAmount = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return "Amount is required";
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return "Use up to 2 decimal places";

    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed) || parsed <= 0) return "Amount must be greater than 0";

    return "";
  };

  const currentAmountError = validateAmount(amount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateAmount(amount);
    if (validationError) {
      setAmountError(validationError);
      return;
    }

    if (!category) return;

    onAddTransaction({
      type,
      category,
      description,
      amount: Number(amount),
    });

    setCategory("");
    setDescription("");
    setAmount("");
    setAmountError("");
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold">Add Transaction</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v: "cash_in" | "cash_out") => { setType(v); setCategory(""); }}>
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_in">Cash In</SelectItem>
                  <SelectItem value="cash_out">Cash Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
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
            />
            {amountError && (
              <p className="text-sm text-destructive">{amountError}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={!category || !!currentAmountError}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
