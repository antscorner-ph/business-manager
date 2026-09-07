import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChevronDown,
  Download,
  PhilippinePeso,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SummaryCard } from "@/components/SummaryCard";
import { ProfitLossReport } from "@/hooks/useProfitAndLoss";
import { ProfitLossTable } from "@/components/ProfitLossTable";
import { format, subMonths } from "date-fns";

interface ProfitLossOverviewProps {
  report: ProfitLossReport;
}

const currency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 2,
  }).format(amount);

const compactCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);

const percentDelta = (current: number, previous: number) => {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
};

const trendConfig = {
  revenue: {
    label: "Revenue",
    color: "#0ea5e9",
  },
  expenses: {
    label: "Expenses",
    color: "#f97316",
  },
  net: {
    label: "Net Income",
    color: "#22c55e",
  },
} satisfies ChartConfig;

const expenseConfig = {
  amount: {
    label: "Amount",
    color: "#f97316",
  },
} satisfies ChartConfig;

export function ProfitLossOverview({ report }: ProfitLossOverviewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [compareMode, setCompareMode] = useState<"previous_month" | "same_month_last_year">("previous_month");
  const [basisMode, setBasisMode] = useState<"cash" | "accrual">("cash");

  const monthKeys = report.months.map((m) => m.key);
  const latestMonthKey = monthKeys[monthKeys.length - 1];
  const previousMonthKey = monthKeys.length > 1 ? monthKeys[monthKeys.length - 2] : null;

  const sameMonthLastYearKey = format(
    subMonths(new Date(`${latestMonthKey}-01`), 12),
    "yyyy-MM"
  );

  const compareMonthKey =
    compareMode === "same_month_last_year"
      ? monthKeys.includes(sameMonthLastYearKey)
        ? sameMonthLastYearKey
        : null
      : previousMonthKey;

  const compareLabel = compareMode === "same_month_last_year" ? "vs same month last year" : "vs previous month";

  const latestRevenue = report.totalRevenue.values[latestMonthKey] || 0;
  const latestExpenses = report.totalExpenses.values[latestMonthKey] || 0;
  const latestNet = report.netIncome.values[latestMonthKey] || 0;
  const latestMargin = latestRevenue === 0 ? 0 : (latestNet / latestRevenue) * 100;

  const previousRevenue = compareMonthKey ? report.totalRevenue.values[compareMonthKey] || 0 : 0;
  const previousExpenses = compareMonthKey ? report.totalExpenses.values[compareMonthKey] || 0 : 0;
  const previousNet = compareMonthKey ? report.netIncome.values[compareMonthKey] || 0 : 0;

  const revenueDelta = compareMonthKey ? percentDelta(latestRevenue, previousRevenue) : null;
  const expensesDelta = compareMonthKey ? percentDelta(latestExpenses, previousExpenses) : null;
  const netDelta = compareMonthKey ? percentDelta(latestNet, previousNet) : null;

  const formatDeltaWithContext = (value: number | null) => {
    if (value === null) return `No data ${compareLabel}`;
    const sign = value > 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}% ${compareLabel}`;
  };

  const trendData = useMemo(
    () =>
      report.months.map((month) => ({
        month: month.label,
        revenue: report.totalRevenue.values[month.key] || 0,
        expenses: report.totalExpenses.values[month.key] || 0,
        net: report.netIncome.values[month.key] || 0,
      })),
    [report]
  );

  const expenseBreakdownData = useMemo(() => {
    return report.expenseRows
      .filter((row) => row.rowType !== "section")
      .map((row) => ({
        category: row.label,
        amount: row.values[latestMonthKey] || 0,
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [report, latestMonthKey]);

  const handleExportCsv = () => {
    const rows: string[] = [];
    rows.push(["Profit and Loss Statement", ...report.months.map((m) => m.label)].join(","));
    rows.push("");
    rows.push("Revenue");

    for (const row of report.revenueRows) {
      rows.push([
        `"${row.label}"`,
        ...report.months.map((m) => (row.values[m.key] || 0).toFixed(2)),
      ].join(","));
    }

    rows.push([
      `"${report.totalRevenue.label}"`,
      ...report.months.map((m) => (report.totalRevenue.values[m.key] || 0).toFixed(2)),
    ].join(","));

    rows.push("");
    rows.push("Expenses");

    for (const row of report.expenseRows) {
      if (row.rowType === "section") {
        rows.push(`"${row.label}"`);
        continue;
      }

      rows.push([
        `"${row.label}"`,
        ...report.months.map((m) => (row.values[m.key] || 0).toFixed(2)),
      ].join(","));
    }

    rows.push([
      `"${report.totalExpenses.label}"`,
      ...report.months.map((m) => (report.totalExpenses.values[m.key] || 0).toFixed(2)),
    ].join(","));

    rows.push([
      `"${report.netIncome.label}"`,
      ...report.months.map((m) => (report.netIncome.values[m.key] || 0).toFixed(2)),
    ].join(","));

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `profit-loss-${latestMonthKey}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Basis</Badge>
          <Select value={basisMode} onValueChange={(value: "cash" | "accrual") => setBasisMode(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="cash">Cash Basis</SelectItem>
              <SelectItem value="accrual" disabled>
                Accrual Basis (soon)
              </SelectItem>
            </SelectContent>
          </Select>
          {basisMode === "cash" && (
            <p className="text-xs text-muted-foreground">Current calculations are cash basis.</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline">Compare</Badge>
          <Select
            value={compareMode}
            onValueChange={(value: "previous_month" | "same_month_last_year") => setCompareMode(value)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="previous_month">Previous Month</SelectItem>
              <SelectItem value="same_month_last_year">Same Month Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Revenue"
          value={compactCurrency(latestRevenue)}
          icon={PhilippinePeso}
          variant="default"
          subtitle={formatDeltaWithContext(revenueDelta)}
        />
        <SummaryCard
          title="Expenses"
          value={compactCurrency(latestExpenses)}
          icon={Receipt}
          variant="warning"
          subtitle={formatDeltaWithContext(expensesDelta)}
        />
        <SummaryCard
          title="Net Income"
          value={compactCurrency(latestNet)}
          icon={latestNet >= 0 ? TrendingUp : TrendingDown}
          variant={latestNet >= 0 ? "success" : "destructive"}
          subtitle={formatDeltaWithContext(netDelta)}
        />
        <SummaryCard
          title="Net Margin"
          value={`${latestMargin.toFixed(1)}%`}
          icon={latestMargin >= 0 ? TrendingUp : TrendingDown}
          variant={latestMargin >= 0 ? "success" : "destructive"}
          subtitle={`${currency(latestNet)} from ${currency(latestRevenue)}`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>P&L Trend</CardTitle>
            <CardDescription>Revenue, expenses, and net by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[320px] w-full">
              <LineChart data={trendData} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => compactCurrency(Number(value))}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => currency(Number(value))}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="net" stroke="var(--color-net)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Expense Categories</CardTitle>
            <CardDescription>Latest month spend breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {expenseBreakdownData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid expenses for this month yet.</p>
            ) : (
              <ChartContainer config={expenseConfig} className="h-[320px] w-full">
                <BarChart data={expenseBreakdownData} layout="vertical" margin={{ left: 12, right: 16, top: 8, bottom: 8 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" tickFormatter={(value) => compactCurrency(Number(value))} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={130}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => currency(Number(value))}
                      />
                    }
                  />
                  <Bar dataKey="amount" fill="var(--color-amount)" radius={4} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div>
            <h3 className="font-semibold">Detailed Statement</h3>
            <p className="text-sm text-muted-foreground">Full spreadsheet-style P&L for validation and auditing</p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {showDetails ? "Hide Details" : "Show Details"}
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
        </div>
        <CollapsibleContent className="mt-4">
          <ProfitLossTable report={report} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
