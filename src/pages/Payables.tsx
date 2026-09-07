import { Link } from "react-router-dom";
import { AlertTriangle, CreditCard, ExternalLink, Search, ShoppingCart, Wallet } from "lucide-react";
import { KpiDateRangeFilter } from "@/components/KpiDateRangeFilter";
import { SummaryCard } from "@/components/SummaryCard";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { usePayables } from "@/hooks/usePayables";
import { STATUS_TAG_CLASSES, formatTagLabel, getTagClass } from "@/lib/tagStyles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);

const sourceLabel: Record<string, string> = {
  purchase_order: "Purchase Order",
  expense: "Expense",
};

const sourceRoute: Record<string, string> = {
  purchase_order: "/purchase-orders",
  expense: "/expenses",
};

const Payables = () => {
  const { payables, query, setQuery, loading } = usePayables();

  const setDateRange = (startDate: string, endDate: string) => {
    setQuery({ ...query, startDate, endDate });
  };

  if (loading) {
    return <PageLoader />;
  }

  const totalOpen = payables.reduce((sum, item) => sum + item.amount, 0);
  const purchaseOrderOpen = payables
    .filter((item) => item.source === "purchase_order")
    .reduce((sum, item) => sum + item.amount, 0);
  const expenseOpen = payables
    .filter((item) => item.source === "expense")
    .reduce((sum, item) => sum + item.amount, 0);
  const highPriorityCount = payables.filter((item) => item.amount >= 10000).length;

  return (
    <PageContainer>
      <PageHeader
        title="Payables"
        description="Track open supplier and expense obligations"
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <KpiDateRangeFilter
            value={{ startDate: query.startDate, endDate: query.endDate }}
            onChange={(next) => setDateRange(next.startDate, next.endDate)}
          />
        </CardContent>
      </Card>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <SummaryCard title="Total Open" value={formatCurrency(totalOpen)} icon={Wallet} variant={totalOpen > 0 ? "warning" : "success"} />
        <SummaryCard title="PO Payables" value={formatCurrency(purchaseOrderOpen)} icon={ShoppingCart} variant={purchaseOrderOpen > 0 ? "warning" : "success"} />
        <SummaryCard title="Expense Payables" value={formatCurrency(expenseOpen)} icon={CreditCard} variant={expenseOpen > 0 ? "warning" : "success"} />
        <SummaryCard title="High Priority" value={String(highPriorityCount)} icon={AlertTriangle} variant={highPriorityCount > 0 ? "destructive" : "success"} subtitle="Items >= PHP 10,000" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Open Payables Register</CardTitle>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search reference, vendor, note..."
                value={query.search}
                onChange={(e) => setQuery({ ...query, search: e.target.value })}
              />
            </div>
            <Select
              value={query.source}
              onValueChange={(value: "all" | "purchase_order" | "expense") =>
                setQuery({ ...query, source: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="purchase_order">Purchase Orders</SelectItem>
                <SelectItem value="expense">Expenses</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={query.status}
              onValueChange={(value: "all" | "unpaid" | "partial") =>
                setQuery({ ...query, status: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Payee / Details</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No open payables for this filter.
                    </TableCell>
                  </TableRow>
                ) : (
                  payables.map((item) => (
                    <TableRow key={`${item.source}-${item.id}`}>
                      <TableCell>{formatDate(item.date)}</TableCell>
                      <TableCell>{sourceLabel[item.source]}</TableCell>
                      <TableCell className="font-medium">{item.reference}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p>{item.payee}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTagClass(STATUS_TAG_CLASSES, item.status)}>
                          {formatTagLabel(item.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(item.amount)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={sourceRoute[item.source]}>
                            Open
                            <ExternalLink className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default Payables;
