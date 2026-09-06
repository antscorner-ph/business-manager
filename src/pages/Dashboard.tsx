import { format, startOfWeek, endOfWeek } from "date-fns";
import { Link } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  Users,
  Building2,
  Calculator,
  ShoppingCart,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useReconciliation } from "@/hooks/useReconciliation";
import { useReceivables } from "@/hooks/useReceivables";
import { useBankDeposits } from "@/hooks/useBankDeposits";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Dashboard = () => {
  const { reconciliation, loading: reconciliationLoading } = useReconciliation();
  const { receivables, loading: receivablesLoading } = useReceivables();
  const { deposits, loading: depositsLoading } = useBankDeposits();
  const { purchaseOrders, loading: purchaseOrdersLoading } = usePurchaseOrders();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  // Calculate totals
  const todaySales = reconciliation?.total_cash_in || 0;
  const expectedBalance = reconciliation?.expected_balance || 0;
  
  const totalReceivables = receivables
    .filter((r) => r.status !== "paid" && r.status !== "written_off")
    .reduce((sum, r) => sum + r.balance, 0);
  
  const overdueReceivables = receivables.filter(
    (r) => r.due_date && new Date(r.due_date) < new Date() && r.status === "pending"
  );

  // Get this week's deposits
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDeposits = deposits.filter((d) => {
    const depositDate = new Date(d.deposit_date);
    return depositDate >= weekStart && depositDate <= weekEnd;
  });
  const weekDepositTotal = weekDeposits.reduce((sum, d) => sum + d.total_amount, 0);

  // Purchase Orders
  const unpaidPurchaseOrders = purchaseOrders.filter(
    (po) => po.payment_status === "unpaid" || po.payment_status === "partial"
  );
  const totalUnpaidAmount = unpaidPurchaseOrders.reduce((sum, po) => sum + po.total_amount, 0);
  const pendingPurchaseOrders = purchaseOrders.filter((po) => po.status === "pending");

  // Get recent receivables (last 5)
  const recentReceivables = receivables
    .filter((r) => r.status !== "paid" && r.status !== "written_off")
    .slice(0, 5);

  if (reconciliationLoading || receivablesLoading || depositsLoading || purchaseOrdersLoading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description={format(new Date(), "EEEE, MMMM d, yyyy")}
      />

        {/* Key Metrics */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(todaySales)}</div>
              <p className="text-xs text-muted-foreground">
                Expected balance: {formatCurrency(expectedBalance)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Receivables</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalReceivables)}</div>
              <p className="text-xs text-muted-foreground">
                {overdueReceivables.length} overdue
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Week's Deposits</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(weekDepositTotal)}</div>
              <p className="text-xs text-muted-foreground">
                {weekDeposits.length} deposits this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Purchase Orders</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalUnpaidAmount)}</div>
              <p className="text-xs text-muted-foreground">
                {unpaidPurchaseOrders.length} unpaid/partial
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {pendingPurchaseOrders.length}
              </div>
              <p className="text-xs text-muted-foreground">
                {purchaseOrders.length} total orders
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Receivables */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Outstanding Receivables</CardTitle>
                  <CardDescription>Customer accounts with pending balances</CardDescription>
                </div>
                <Link to="/receivables">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {recentReceivables.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No outstanding receivables
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Balance</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentReceivables.map((receivable) => (
                        <TableRow key={receivable.id}>
                          <TableCell className="font-medium">
                            {receivable.customer_name}
                          </TableCell>
                          <TableCell>{formatCurrency(receivable.balance)}</TableCell>
                          <TableCell>
                            {receivable.due_date
                              ? format(new Date(receivable.due_date), "MMM dd")
                              : "-"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                receivable.status === "pending"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {receivable.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Bank Deposits */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Bank Deposits</CardTitle>
                  <CardDescription>Latest deposits to bank accounts</CardDescription>
                </div>
                <Link to="/bank-deposits">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {deposits.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No bank deposits recorded
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bank</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.slice(0, 5).map((deposit) => (
                        <TableRow key={deposit.id}>
                          <TableCell className="font-medium">
                            {deposit.bank_name}
                          </TableCell>
                          <TableCell>
                            {format(new Date(deposit.deposit_date), "MMM dd, yyyy")}
                          </TableCell>
                          <TableCell>{formatCurrency(deposit.total_amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                deposit.status === "reconciled"
                                  ? "outline"
                                  : deposit.status === "confirmed"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {deposit.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Purchase Orders */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Purchase Orders</CardTitle>
                  <CardDescription>Latest supplier orders and payments</CardDescription>
                </div>
                <Link to="/purchase-orders">
                  <Button variant="ghost" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {purchaseOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No purchase orders recorded
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Supplier</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Payment Status</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchaseOrders.slice(0, 5).map((po) => (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium">
                            {po.supplier_name}
                          </TableCell>
                          <TableCell>{formatCurrency(po.total_amount)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                po.payment_status === "paid"
                                  ? "outline"
                                  : po.payment_status === "partial"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {po.payment_status.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                po.status === "approved"
                                  ? "default"
                                  : po.status === "cancelled"
                                  ? "destructive"
                                  : "secondary"
                              }
                            >
                              {po.status.toUpperCase()}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and operations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <Link to="/reconciliation">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <Calculator className="h-6 w-6 mb-2" />
                    <span>Daily Sales</span>
                  </Button>
                </Link>
                <Link to="/receivables">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <Users className="h-6 w-6 mb-2" />
                    <span>Manage Receivables</span>
                  </Button>
                </Link>
                <Link to="/bank-deposits">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <Building2 className="h-6 w-6 mb-2" />
                    <span>Record Deposit</span>
                  </Button>
                </Link>
                <Link to="/purchase-orders">
                  <Button variant="outline" className="w-full h-20 flex flex-col">
                    <ShoppingCart className="h-6 w-6 mb-2" />
                    <span>Purchase Orders</span>
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
    </PageContainer>
  );
};

export default Dashboard;
