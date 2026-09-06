import { Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { computeLineTotal, type DraftLineItem } from "@/hooks/usePurchaseOrderItems";

interface POLineItemsTableProps {
  items: DraftLineItem[];
  onChange: (key: string, patch: Partial<DraftLineItem>) => void;
  onRemove: (key: string) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

/** Parses a numeric input, treating blank/invalid values as 0. */
const parseNumber = (value: string) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

export function POLineItemsTable({ items, onChange, onRemove }: POLineItemsTableProps) {
  const grandTotal = items.reduce((sum, item) => sum + computeLineTotal(item), 0);

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-12 text-center text-muted-foreground">
        No items added yet. Search and add products above.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Name</TableHead>
            <TableHead className="w-[120px]">Unit</TableHead>
            <TableHead className="w-[110px] text-right">PO in pcs</TableHead>
            <TableHead className="w-[130px] text-right">Unit cost</TableHead>
            <TableHead className="w-[130px] text-right">Total</TableHead>
            <TableHead className="min-w-[140px]">Inventory</TableHead>
            <TableHead className="w-[52px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.key}>
              <TableCell className="font-medium">{item.name}</TableCell>
              <TableCell>
                <Input
                  value={item.unit}
                  placeholder="e.g. PIECE"
                  onChange={(e) => onChange(item.key, { unit: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  className="text-right"
                  value={item.po_in_pcs}
                  onChange={(e) =>
                    onChange(item.key, { po_in_pcs: parseNumber(e.target.value) })
                  }
                />
              </TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  className="text-right"
                  value={item.unit_cost}
                  onChange={(e) =>
                    onChange(item.key, { unit_cost: parseNumber(e.target.value) })
                  }
                />
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatCurrency(computeLineTotal(item))}
              </TableCell>
              <TableCell>
                <Input
                  value={item.inventory_note}
                  placeholder="e.g. YOOMS/FONE"
                  onChange={(e) => onChange(item.key, { inventory_note: e.target.value })}
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(item.key)}
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="text-right font-semibold">
              Grand Total
            </TableCell>
            <TableCell className="text-right font-bold">
              {formatCurrency(grandTotal)}
            </TableCell>
            <TableCell colSpan={2} />
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
