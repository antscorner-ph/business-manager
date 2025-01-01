import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { DailyReportDialog } from "@/components/DailyReportDialog";

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

const History = () => {
  const [records, setRecords] = useState<DailyReconciliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<DailyReconciliation | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const { data, error } = await supabase
        .from("daily_reconciliations")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "balanced":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "over":
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      case "short":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      balanced: "border-success text-success bg-success/10",
      over: "border-warning text-warning bg-warning/10",
      short: "border-destructive text-destructive bg-destructive/10",
      pending: "border-muted-foreground text-muted-foreground",
    };

    return (
      <Badge variant="outline" className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleViewReport = (record: DailyReconciliation) => {
    setSelectedRecord(record);
    setReportOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Sales History</h1>
          <p className="text-muted-foreground">
            View past daily sales records
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Daily Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No records found</p>
              </div>
            ) : (
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {records.map((record) => (
                    <div
                      key={record.id}
                      className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <div>
                            <p className="font-semibold">
                              {format(new Date(record.date), "EEEE, MMMM d, yyyy")}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3 text-success" />
                                {formatCurrency(record.total_cash_in)}
                              </span>
                              <span className="flex items-center gap-1">
                                <TrendingDown className="h-3 w-3 text-destructive" />
                                {formatCurrency(record.total_cash_out)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(record.expected_balance)}</p>
                          {record.variance !== null && (
                            <p className={`text-sm ${record.variance >= 0 ? "text-success" : "text-destructive"}`}>
                              {record.variance >= 0 ? "+" : ""}{formatCurrency(record.variance)}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(record.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(record)}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Report
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </main>

      <DailyReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reconciliation={selectedRecord}
      />
    </div>
  );
};

export default History;
