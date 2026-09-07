import { ExpensesManager } from "@/components/ExpensesManager";
import { SummaryCard } from "@/components/SummaryCard";
import { KpiDateRangeFilter } from "@/components/KpiDateRangeFilter";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useExpenses } from "@/hooks/useExpenses";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { startOfMonth, addMonths, subMonths } from "date-fns";
import { ReceiptText, AlertTriangle, BarChart3, TrendingUp } from "lucide-react";

const Expenses = () => {
  const {
    expenses,
    kpiExpenses,
    totalCount,
    query,
    setQuery,
    loading,
    addExpense,
    updateExpenseStatus,
    deleteExpense,
  } = useExpenses();

  if (loading) {
    return <PageLoader />;
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const formatPercent = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

  const now = new Date();
  const setDateRange = (startDate: string, endDate: string) => {
    setQuery({ ...query, startDate, endDate, page: 1 });
  };
  const monthStart = startOfMonth(now);
  const nextMonthStart = startOfMonth(addMonths(now, 1));
  const lastMonthStart = startOfMonth(subMonths(now, 1));

  const thisMonthExpenses = kpiExpenses.filter((expense) => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate >= monthStart && expenseDate < nextMonthStart;
  });

  const lastMonthExpenses = kpiExpenses.filter((expense) => {
    const expenseDate = new Date(expense.expense_date);
    return expenseDate >= lastMonthStart && expenseDate < monthStart;
  });

  const thisMonthSpend = thisMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const lastMonthSpend = lastMonthExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const momSpendChange =
    lastMonthSpend > 0 ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : null;

  const openPayables = kpiExpenses.filter((expense) => expense.status !== "paid");
  const openPayablesTotal = openPayables.reduce((sum, expense) => sum + Number(expense.amount), 0);

  const largestExpense = kpiExpenses.reduce<(typeof kpiExpenses)[number] | null>((largest, current) => {
    if (!largest) return current;
    return Number(current.amount) > Number(largest.amount) ? current : largest;
  }, null);

  const categoryTotals = kpiExpenses.reduce<Record<string, number>>((acc, expense) => {
    acc[expense.category] = (acc[expense.category] || 0) + Number(expense.amount);
    return acc;
  }, {});

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const unpaidCoreBills = openPayables.filter((expense) => {
    const description = expense.description.toLowerCase();
    return (
      expense.category === "Rental Expense" ||
      expense.category === "Utilities" ||
      description.includes("rent") ||
      description.includes("electric") ||
      description.includes("water") ||
      description.includes("wifi") ||
      description.includes("pldt") ||
      description.includes("subscription")
    );
  });

  const unpaidCoreBillsTotal = unpaidCoreBills.reduce((sum, expense) => sum + Number(expense.amount), 0);

  return (
    <PageContainer>
      <PageHeader
        title="Expenses"
        description="Track paid and unpaid operating expenses"
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
          title="This Month Spend"
          value={formatCurrency(thisMonthSpend)}
          icon={ReceiptText}
        />
        <SummaryCard
          title="Open Payables"
          value={formatCurrency(openPayablesTotal)}
          icon={AlertTriangle}
          variant={openPayablesTotal > 0 ? "warning" : "success"}
          subtitle={`${openPayables.length} unpaid/partial items`}
        />
        <SummaryCard
          title="Largest Expense"
          value={formatCurrency(Number(largestExpense?.amount || 0))}
          icon={BarChart3}
          subtitle={largestExpense?.description || "No entries"}
        />
        <SummaryCard
          title="MoM Spend Change"
          value={momSpendChange === null ? "N/A" : formatPercent(momSpendChange)}
          icon={TrendingUp}
          variant={momSpendChange !== null && momSpendChange > 0 ? "warning" : "success"}
          subtitle="Current month vs previous month"
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Owner Insights</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium mb-2">Top Expense Categories</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {topCategories.length === 0 ? (
                <p>No category data yet.</p>
              ) : (
                topCategories.map(([category, amount]) => (
                  <p key={category}>
                    {category}: {formatCurrency(amount)}
                  </p>
                ))
              )}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Core Bills Exposure</p>
            <p className="text-sm text-muted-foreground">
              {unpaidCoreBills.length} unpaid core bills totaling {formatCurrency(unpaidCoreBillsTotal)}.
            </p>
          </div>
        </CardContent>
      </Card>

      <ExpensesManager
        expenses={expenses}
        totalCount={totalCount}
        query={query}
        onQueryChange={setQuery}
        onAddExpense={addExpense}
        onUpdateStatus={updateExpenseStatus}
        onDeleteExpense={deleteExpense}
      />
    </PageContainer>
  );
};

export default Expenses;
