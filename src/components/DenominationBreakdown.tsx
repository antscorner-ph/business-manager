import { useState, useEffect } from "react";
import { Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

interface DenominationBreakdownProps {
  onTotalCalculated: (total: number) => void;
}

const PHP_DENOMINATIONS = [
  { label: "₱1000", value: 1000 },
  { label: "₱500", value: 500 },
  { label: "₱200", value: 200 },
  { label: "₱100", value: 100 },
  { label: "₱50", value: 50 },
  { label: "₱20", value: 20 },
  { label: "₱10", value: 10 },
  { label: "₱5", value: 5 },
  { label: "₱1", value: 1 },
  { label: "₱0.25", value: 0.25 },
  { label: "₱0.10", value: 0.1 },
  { label: "₱0.05", value: 0.05 },
];

export const DenominationBreakdown = ({
  onTotalCalculated,
}: DenominationBreakdownProps) => {
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<number, number>>({});

  const handleCountChange = (denomination: number, count: string) => {
    const numCount = parseInt(count) || 0;
    setCounts((prev) => ({
      ...prev,
      [denomination]: numCount,
    }));
  };

  const total = PHP_DENOMINATIONS.reduce((sum, denom) => {
    return sum + (counts[denom.value] || 0) * denom.value;
  }, 0);

  const handleApply = () => {
    onTotalCalculated(total);
    setOpen(false);
  };

  const handleClear = () => {
    setCounts({});
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calculator className="h-4 w-4" />
          Count by Denomination
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cash Denomination Breakdown</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {/* Bills Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Bills
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {PHP_DENOMINATIONS.filter((d) => d.value >= 20).map((denom) => (
                <div
                  key={denom.value}
                  className="flex items-center gap-2 rounded-lg border bg-card p-2"
                >
                  <Label className="w-16 text-sm font-medium">
                    {denom.label}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={counts[denom.value] || ""}
                    onChange={(e) =>
                      handleCountChange(denom.value, e.target.value)
                    }
                    className="h-8 text-center"
                  />
                  <span className="w-20 text-right text-sm text-muted-foreground">
                    ₱{((counts[denom.value] || 0) * denom.value).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Coins Section */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Coins
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {PHP_DENOMINATIONS.filter((d) => d.value < 20).map((denom) => (
                <div
                  key={denom.value}
                  className="flex items-center gap-2 rounded-lg border bg-card p-2"
                >
                  <Label className="w-16 text-sm font-medium">
                    {denom.label}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={counts[denom.value] || ""}
                    onChange={(e) =>
                      handleCountChange(denom.value, e.target.value)
                    }
                    className="h-8 text-center"
                  />
                  <span className="w-20 text-right text-sm text-muted-foreground">
                    ₱{((counts[denom.value] || 0) * denom.value).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="rounded-lg bg-primary/10 p-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">
                ₱{total.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <Button onClick={handleApply}>Apply Total</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
