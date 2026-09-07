import { ReceivablesManager } from "@/components/ReceivablesManager";
import { SummaryCard } from "@/components/SummaryCard";
import { KpiDateRangeFilter } from "@/components/KpiDateRangeFilter";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useReceivables } from "@/hooks/useReceivables";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Clock3, Percent, Wallet } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

const Receivables = () => {
  const {
    receivables,
    kpiReceivables,
    totalCount,
    query,
    setQuery,
    loading,
    addReceivable,
    addPayment,
    updateStatus,
  } = useReceivables();

  if (loading) {
    return <PageLoader />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  const today = new Date();

  const setDateRange = (startDate: string, endDate: string) => {
    setQuery({ ...query, startDate, endDate, page: 1 });
  };

  const totalBilled = kpiReceivables.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalCollected = kpiReceivables.reduce((sum, r) => sum + Number(r.amount_paid), 0);
  const openReceivables = kpiReceivables.filter(
    (r) => r.status !== "paid" && r.status !== "written_off"
  );
  const totalOutstanding = openReceivables
    .filter((r) => r.status !== "written_off")
    .reduce((sum, r) => sum + Number(r.balance), 0);
  const overdueBalance = openReceivables
    .filter(
      (r) =>
        Boolean(r.due_date) &&
        new Date(r.due_date as string) < new Date() &&
        r.status !== "paid" &&
        r.status !== "written_off"
    )
    .reduce((sum, r) => sum + Number(r.balance), 0);

  const overdueRatio = totalOutstanding > 0 ? (overdueBalance / totalOutstanding) * 100 : 0;
  const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;

  const averageOpenAgeDays =
    openReceivables.length > 0
      ? Math.round(
          openReceivables.reduce((sum, receivable) => {
            return sum + Math.max(0, differenceInCalendarDays(today, new Date(receivable.date_issued)));
          }, 0) / openReceivables.length
        )
      : 0;

  const agingBuckets = openReceivables.reduce(
    (acc, receivable) => {
      if (!receivable.due_date) {
        acc.current += Number(receivable.balance);
        return acc;
      }

      const daysPastDue = differenceInCalendarDays(today, new Date(receivable.due_date));
      if (daysPastDue <= 0) acc.current += Number(receivable.balance);
      else if (daysPastDue <= 30) acc.days1To30 += Number(receivable.balance);
      else if (daysPastDue <= 60) acc.days31To60 += Number(receivable.balance);
      else acc.days61Plus += Number(receivable.balance);

      return acc;
    },
    { current: 0, days1To30: 0, days31To60: 0, days61Plus: 0 }
  );

  const topOutstandingCustomers = Object.entries(
    openReceivables.reduce<Record<string, number>>((acc, receivable) => {
      acc[receivable.customer_name] = (acc[receivable.customer_name] || 0) + Number(receivable.balance);
      return acc;
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <PageContainer>
      <PageHeader
        title="Receivables"
        description="Manage customer accounts and payment tracking"
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <KpiDateRangeFilter
            value={{ startDate: query.startDate, endDate: query.endDate }}
            onChange={(next) => setDateRange(next.startDate, next.endDate)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <SummaryCard
          title="Outstanding Balance"
          value={formatCurrency(totalOutstanding)}
          icon={Wallet}
          variant={totalOutstanding > 0 ? "warning" : "success"}
        />
        <SummaryCard
          title="Overdue Amount"
          value={formatCurrency(overdueBalance)}
          icon={AlertTriangle}
          variant={overdueBalance > 0 ? "destructive" : "success"}
        />
        <SummaryCard
          title="Overdue Ratio"
          value={formatPercent(overdueRatio)}
          icon={Percent}
          variant={overdueRatio >= 30 ? "destructive" : overdueRatio >= 15 ? "warning" : "success"}
        />
        <SummaryCard
          title="Collection Rate"
          value={formatPercent(collectionRate)}
          icon={Clock3}
          variant={collectionRate >= 85 ? "success" : collectionRate >= 70 ? "warning" : "destructive"}
          subtitle={`Avg open age: ${averageOpenAgeDays} days`}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Aging And Collection Focus</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Current: {formatCurrency(agingBuckets.current)}</p>
            <p>1-30 days overdue: {formatCurrency(agingBuckets.days1To30)}</p>
            <p>31-60 days overdue: {formatCurrency(agingBuckets.days31To60)}</p>
            <p>61+ days overdue: {formatCurrency(agingBuckets.days61Plus)}</p>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Top Outstanding Customers</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {topOutstandingCustomers.length === 0 ? (
                <p>No outstanding customer balances.</p>
              ) : (
                topOutstandingCustomers.map(([customerName, balance]) => (
                  <p key={customerName}>
                    {customerName}: {formatCurrency(balance)}
                  </p>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <ReceivablesManager
        receivables={receivables}
        totalCount={totalCount}
        query={query}
        onQueryChange={setQuery}
        onAddReceivable={addReceivable}
        onAddPayment={addPayment}
        onUpdateStatus={updateStatus}
      />
    </PageContainer>
  );
};

export default Receivables;
