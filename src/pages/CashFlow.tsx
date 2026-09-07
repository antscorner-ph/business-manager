import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CashFlowTable } from "@/components/CashFlowTable";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useCashFlow } from "@/hooks/useCashFlow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

const trendConfig = {
  opening: {
    label: "Opening",
    color: "#64748b",
  },
  inflow: {
    label: "Inflow",
    color: "#0ea5e9",
  },
  outflow: {
    label: "Outflow",
    color: "#f97316",
  },
  ending: {
    label: "Ending",
    color: "#22c55e",
  },
} satisfies ChartConfig;

const formatCurrency = (amount: number) =>
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

const CashFlow = () => {
  const { report, monthsToShow, setMonthsToShow, sourceMode, setSourceMode, loading } = useCashFlow();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Cash Flow"
        description="Monthly inflow, outflow, and surplus or deficit"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Outflow Source</Badge>
            <Select
              value={sourceMode}
              onValueChange={(value: "expenses_only" | "daily_cash_out_only" | "combined") => setSourceMode(value)}
            >
              <SelectTrigger className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expenses_only">Expenses Only (recommended)</SelectItem>
                <SelectItem value="daily_cash_out_only">Daily Sales Cash-Out Only</SelectItem>
                <SelectItem value="combined">Combined (use with care)</SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(monthsToShow)} onValueChange={(value: "6" | "12") => setMonthsToShow(Number(value) as 6 | 12)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      {report ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cash Position Trend</CardTitle>
              <CardDescription>Opening, inflow, outflow, and ending balance per month</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={trendConfig} className="h-[320px] w-full">
                <LineChart data={report.trendSeries} margin={{ left: 8, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrency(Number(value))} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent formatter={(value) => formatCurrency(Number(value))} />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="opening" stroke="var(--color-opening)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="inflow" stroke="var(--color-inflow)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="outflow" stroke="var(--color-outflow)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ending" stroke="var(--color-ending)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <CashFlowTable report={report} sourceMode={sourceMode} />
        </div>
      ) : null}
    </PageContainer>
  );
};

export default CashFlow;
