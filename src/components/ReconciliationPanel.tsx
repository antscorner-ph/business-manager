import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, AlertTriangle, XCircle, Calculator } from "lucide-react";
import { DenominationBreakdown } from "./DenominationBreakdown";

interface ReconciliationPanelProps {
  openingBalance: number;
  totalCashIn: number;
  totalCashOut: number;
  onOpeningBalanceChange: (value: number) => void;
  onReconcile?: (actualCash: number) => void;
  status?: string;
  actualCash?: number | null;
  variance?: number | null;
}

export function ReconciliationPanel({
  openingBalance,
  totalCashIn,
  totalCashOut,
  onOpeningBalanceChange,
  onReconcile,
  status: savedStatus,
  actualCash: savedActualCash,
  variance: savedVariance,
}: ReconciliationPanelProps) {
  const [actualCash, setActualCash] = useState<string>("");
  const [isReconciled, setIsReconciled] = useState(false);

  // Initialize from saved values
  useEffect(() => {
    if (savedActualCash !== null && savedActualCash !== undefined) {
      setActualCash(savedActualCash.toString());
      setIsReconciled(savedStatus !== "pending");
    }
  }, [savedActualCash, savedStatus]);

  const expectedBalance = openingBalance + totalCashIn - totalCashOut;
  const actualBalance = parseFloat(actualCash) || 0;
  const variance = isReconciled && savedVariance !== null ? savedVariance : actualBalance - expectedBalance;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const getVarianceStatus = () => {
    if (!actualCash && !isReconciled) return null;
    if (Math.abs(variance) < 0.01) return "balanced";
    if (variance > 0) return "over";
    return "short";
  };

  const status = isReconciled && savedStatus ? savedStatus : getVarianceStatus();

  const handleReconcile = () => {
    if (actualCash && onReconcile) {
      onReconcile(parseFloat(actualCash));
      setIsReconciled(true);
    }
  };

  return (
    <Card className="border-2">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Cash Reconciliation</CardTitle>
          {isReconciled && status && status !== "pending" && (
            <Badge
              variant="outline"
              className={
                status === "balanced"
                  ? "border-success text-success"
                  : status === "over"
                  ? "border-warning text-warning"
                  : "border-destructive text-destructive"
              }
            >
              {status === "balanced" ? "Balanced" : status === "over" ? "Cash Over" : "Cash Short"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="opening">Opening Balance (₱)</Label>
          <Input
            id="opening"
            type="number"
            step="0.01"
            value={openingBalance || ""}
            onChange={(e) => {
              onOpeningBalanceChange(parseFloat(e.target.value) || 0);
              setIsReconciled(false);
            }}
            placeholder="0.00"
          />
        </div>

        <Separator />

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Opening Balance</span>
            <span className="font-medium">{formatCurrency(openingBalance)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-success">+ Cash In</span>
            <span className="font-medium text-success">{formatCurrency(totalCashIn)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-destructive">- Cash Out</span>
            <span className="font-medium text-destructive">{formatCurrency(totalCashOut)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="font-semibold">Expected Balance</span>
            <span className="text-lg font-bold">{formatCurrency(expectedBalance)}</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="actual">Actual Cash Count (₱)</Label>
            <DenominationBreakdown
              onTotalCalculated={(total) => {
                setActualCash(total.toString());
                setIsReconciled(false);
              }}
            />
          </div>
          <Input
            id="actual"
            type="number"
            step="0.01"
            value={actualCash}
            onChange={(e) => {
              setActualCash(e.target.value);
              setIsReconciled(false);
            }}
            placeholder="Enter actual cash on hand..."
          />
        </div>

        <Button onClick={handleReconcile} className="w-full" disabled={!actualCash}>
          <Calculator className="mr-2 h-4 w-4" />
          Reconcile
        </Button>

        {isReconciled && actualCash && status && status !== "pending" && (
          <div
            className={`rounded-lg p-4 ${
              status === "balanced"
                ? "bg-success/10 border border-success/30"
                : status === "over"
                ? "bg-warning/10 border border-warning/30"
                : "bg-destructive/10 border border-destructive/30"
            }`}
          >
            <div className="flex items-center gap-3">
              {status === "balanced" ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : status === "over" ? (
                <AlertTriangle className="h-5 w-5 text-warning" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="font-semibold">
                  {status === "balanced"
                    ? "Cash Balanced!"
                    : status === "over"
                    ? "Cash Over"
                    : "Cash Short"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Variance: {formatCurrency(Math.abs(variance))}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
