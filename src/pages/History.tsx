import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, TrendingUp, TrendingDown, CheckCircle2, AlertTriangle, XCircle, Search, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { DailyReportDialog } from "@/components/DailyReportDialog";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { KpiDateRangeFilter } from "@/components/KpiDateRangeFilter";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

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
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<DailyReconciliation | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [dateRange, setDateRange] = useState({ startDate: "", endDate: "" });
  const [statusFilter, setStatusFilter] = useState<"all" | "balanced" | "over" | "short" | "pending">("all");
  const [sortBy, setSortBy] = useState<"date_desc" | "date_asc" | "cash_in_desc" | "cash_in_asc" | "cash_out_desc" | "cash_out_asc" | "variance_desc" | "variance_asc">("date_desc");
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadHistory = async () => {
    try {
      setLoading(true);

      let request = supabase
        .from("daily_reconciliations")
        .select("*", { count: "exact" });

      if (dateRange.startDate) {
        request = request.gte("date", dateRange.startDate);
      }

      if (dateRange.endDate) {
        request = request.lte("date", dateRange.endDate);
      }

      if (statusFilter !== "all") {
        request = request.eq("status", statusFilter);
      }

      const searchTerm = debouncedSearch.trim();
      if (searchTerm) {
        const normalized = searchTerm.toLowerCase();
        if (["balanced", "over", "short", "pending"].includes(normalized)) {
          request = request.ilike("status", `%${normalized}%`);
        } else if (/^\d{4}-\d{2}-\d{2}$/.test(searchTerm)) {
          request = request.eq("date", searchTerm);
        } else if (/^\d{4}-\d{2}$/.test(searchTerm)) {
          const [year, month] = searchTerm.split("-");
          const monthNumber = Number(month);
          const nextYear = monthNumber === 12 ? Number(year) + 1 : Number(year);
          const nextMonth = monthNumber === 12 ? "01" : String(monthNumber + 1).padStart(2, "0");
          request = request.gte("date", `${searchTerm}-01`).lt("date", `${nextYear}-${nextMonth}-01`);
        }
      }

      switch (sortBy) {
        case "date_asc":
          request = request.order("date", { ascending: true });
          break;
        case "cash_in_desc":
          request = request.order("total_cash_in", { ascending: false });
          break;
        case "cash_in_asc":
          request = request.order("total_cash_in", { ascending: true });
          break;
        case "cash_out_desc":
          request = request.order("total_cash_out", { ascending: false });
          break;
        case "cash_out_asc":
          request = request.order("total_cash_out", { ascending: true });
          break;
        case "variance_desc":
          request = request.order("variance", { ascending: false });
          break;
        case "variance_asc":
          request = request.order("variance", { ascending: true });
          break;
        case "date_desc":
        default:
          request = request.order("date", { ascending: false });
          break;
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await request.range(from, to);

      if (error) throw error;

      setRecords(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, pageSize, sortBy, dateRange, statusFilter, debouncedSearch]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, sortBy, dateRange, statusFilter, debouncedSearch]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

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

  const formatVariance = (value: number | null) => {
    if (value === null) return "—";
    const sign = value >= 0 ? "+" : "-";
    return `${sign}${formatCurrency(Math.abs(value))}`;
  };

  const handleViewReport = (record: DailyReconciliation) => {
    setSelectedRecord(record);
    setReportOpen(true);
  };

  return (
    <PageContainer>
      <PageHeader title="Sales History" description="View past daily sales records" />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="w-full lg:max-w-[420px]">
              <KpiDateRangeFilter
                value={dateRange}
                onChange={(next) => setDateRange({ startDate: next.startDate, endDate: next.endDate })}
              />
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="relative min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search date or status..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={(value: typeof statusFilter) => setStatusFilter(value)}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="balanced">Balanced</SelectItem>
                  <SelectItem value="over">Over</SelectItem>
                  <SelectItem value="short">Short</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date_desc">Date Newest First</SelectItem>
                  <SelectItem value="date_asc">Date Oldest First</SelectItem>
                  <SelectItem value="cash_in_desc">Cash In High to Low</SelectItem>
                  <SelectItem value="cash_in_asc">Cash In Low to High</SelectItem>
                  <SelectItem value="cash_out_desc">Cash Out High to Low</SelectItem>
                  <SelectItem value="cash_out_asc">Cash Out Low to High</SelectItem>
                  <SelectItem value="variance_desc">Variance High to Low</SelectItem>
                  <SelectItem value="variance_asc">Variance Low to High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Daily Records</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Showing {totalCount === 0 ? 0 : (page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalCount)} of {totalCount}
              </span>
              <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                <SelectTrigger className="w-[90px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading...</span>
              </div>
            </div>
          ) : totalCount === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No records match the current filters</p>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[560px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Cash In</TableHead>
                      <TableHead>Cash Out</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Variance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {format(new Date(record.date), "EEE, MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-success">
                          <span className="inline-flex items-center gap-1">
                            <TrendingUp className="h-3.5 w-3.5" />
                            {formatCurrency(record.total_cash_in)}
                          </span>
                        </TableCell>
                        <TableCell className="text-destructive">
                          <span className="inline-flex items-center gap-1">
                            <TrendingDown className="h-3.5 w-3.5" />
                            {formatCurrency(record.total_cash_out)}
                          </span>
                        </TableCell>
                        <TableCell>{formatCurrency(record.expected_balance)}</TableCell>
                        <TableCell className={record.variance !== null && record.variance >= 0 ? "text-success" : "text-destructive"}>
                          {formatVariance(record.variance)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(record.status)}
                            {getStatusBadge(record.status)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => handleViewReport(record)}>
                            <FileText className="h-4 w-4 mr-1" />
                            Report
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DailyReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reconciliation={selectedRecord}
      />
    </PageContainer>
  );
};

export default History;
