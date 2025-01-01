import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Printer, Download, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface DailyReconciliation {
  id: string;
  date: string;
  opening_balance: number;
  total_cash_in: number;
  total_cash_out: number;
  expected_balance: number;
  actual_cash: number | null;
  variance: number | null;
  status: string;
}

interface Transaction {
  id: string;
  type: string;
  category: string;
  description: string | null;
  amount: number;
  created_at: string;
}

interface DailyReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reconciliation: DailyReconciliation | null;
}

export function DailyReportDialog({
  open,
  onOpenChange,
  reconciliation,
}: DailyReportDialogProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && reconciliation) {
      loadTransactions(reconciliation.id);
    }
  }, [open, reconciliation]);

  const loadTransactions = async (reconciliationId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("reconciliation_id", reconciliationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Daily Cash Report - ${reconciliation?.date}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .header { text-align: center; margin-bottom: 20px; }
            .summary { margin: 20px 0; }
            .summary-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .text-success { color: #22c55e; }
            .text-destructive { color: #ef4444; }
            .status-box { padding: 10px; border-radius: 8px; margin-top: 20px; }
            .balanced { background-color: #dcfce7; border: 1px solid #22c55e; }
            .over { background-color: #fef9c3; border: 1px solid #eab308; }
            .short { background-color: #fee2e2; border: 1px solid #ef4444; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!reconciliation) return null;

  const cashInTransactions = transactions.filter((t) => t.type === "cash_in");
  const cashOutTransactions = transactions.filter((t) => t.type === "cash_out");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Daily Cash Report</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div ref={reportRef} className="space-y-6 p-4">
            {/* Header */}
            <div className="text-center">
              <h2 className="text-xl font-bold">Daily Cash Reconciliation Report</h2>
              <p className="text-muted-foreground">
                {format(new Date(reconciliation.date), "EEEE, MMMM d, yyyy")}
              </p>
            </div>

            <Separator />

            {/* Summary Section */}
            <div className="space-y-3">
              <h3 className="font-semibold text-lg">Summary</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Opening Balance:</span>
                    <span className="font-medium">{formatCurrency(reconciliation.opening_balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-success">Total Cash In:</span>
                    <span className="font-medium text-success">
                      +{formatCurrency(reconciliation.total_cash_in)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-destructive">Total Cash Out:</span>
                    <span className="font-medium text-destructive">
                      -{formatCurrency(reconciliation.total_cash_out)}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expected Balance:</span>
                    <span className="font-bold">{formatCurrency(reconciliation.expected_balance)}</span>
                  </div>
                  {reconciliation.actual_cash !== null && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Actual Cash:</span>
                        <span className="font-medium">{formatCurrency(reconciliation.actual_cash)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Variance:</span>
                        <span className={`font-medium ${(reconciliation.variance || 0) >= 0 ? "text-success" : "text-destructive"}`}>
                          {(reconciliation.variance || 0) >= 0 ? "+" : ""}{formatCurrency(reconciliation.variance || 0)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* Cash In Transactions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-success" />
                <h3 className="font-semibold text-lg">Cash In Transactions</h3>
                <Badge variant="outline" className="text-success border-success">
                  {cashInTransactions.length}
                </Badge>
              </div>
              {cashInTransactions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No cash in transactions</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 text-sm font-medium">Time</th>
                      <th className="text-left p-2 text-sm font-medium">Category</th>
                      <th className="text-left p-2 text-sm font-medium">Description</th>
                      <th className="text-right p-2 text-sm font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashInTransactions.map((t) => (
                      <tr key={t.id} className="border-b">
                        <td className="p-2 text-sm">{format(new Date(t.created_at), "h:mm a")}</td>
                        <td className="p-2 text-sm">{t.category}</td>
                        <td className="p-2 text-sm text-muted-foreground">{t.description || "-"}</td>
                        <td className="p-2 text-sm text-right text-success font-medium">
                          +{formatCurrency(Number(t.amount))}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-success/10">
                      <td colSpan={3} className="p-2 text-sm font-semibold">Subtotal</td>
                      <td className="p-2 text-sm text-right text-success font-bold">
                        {formatCurrency(reconciliation.total_cash_in)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Cash Out Transactions */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-destructive" />
                <h3 className="font-semibold text-lg">Cash Out Transactions</h3>
                <Badge variant="outline" className="text-destructive border-destructive">
                  {cashOutTransactions.length}
                </Badge>
              </div>
              {cashOutTransactions.length === 0 ? (
                <p className="text-muted-foreground text-sm">No cash out transactions</p>
              ) : (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 text-sm font-medium">Time</th>
                      <th className="text-left p-2 text-sm font-medium">Category</th>
                      <th className="text-left p-2 text-sm font-medium">Description</th>
                      <th className="text-right p-2 text-sm font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cashOutTransactions.map((t) => (
                      <tr key={t.id} className="border-b">
                        <td className="p-2 text-sm">{format(new Date(t.created_at), "h:mm a")}</td>
                        <td className="p-2 text-sm">{t.category}</td>
                        <td className="p-2 text-sm text-muted-foreground">{t.description || "-"}</td>
                        <td className="p-2 text-sm text-right text-destructive font-medium">
                          -{formatCurrency(Number(t.amount))}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-destructive/10">
                      <td colSpan={3} className="p-2 text-sm font-semibold">Subtotal</td>
                      <td className="p-2 text-sm text-right text-destructive font-bold">
                        {formatCurrency(reconciliation.total_cash_out)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Status Box */}
            {reconciliation.status !== "pending" && (
              <div
                className={`rounded-lg p-4 ${
                  reconciliation.status === "balanced"
                    ? "bg-success/10 border border-success/30"
                    : reconciliation.status === "over"
                    ? "bg-warning/10 border border-warning/30"
                    : "bg-destructive/10 border border-destructive/30"
                }`}
              >
                <div className="flex items-center gap-3">
                  {reconciliation.status === "balanced" ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : reconciliation.status === "over" ? (
                    <AlertTriangle className="h-5 w-5 text-warning" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {reconciliation.status === "balanced"
                        ? "Cash Balanced"
                        : reconciliation.status === "over"
                        ? "Cash Over"
                        : "Cash Short"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Variance: {formatCurrency(Math.abs(reconciliation.variance || 0))}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
