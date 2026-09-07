import { useState } from "react";
import { Area, AreaChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { AlertCircle, ChevronDown, Download, Scale, ShieldAlert, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { SummaryCard } from "@/components/SummaryCard";
import { BalanceSheetReport } from "@/hooks/useBalanceSheet";
import { BalanceSheetTable } from "@/components/BalanceSheetTable";

interface BalanceSheetOverviewProps {
  report: BalanceSheetReport;
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

const trendConfig = {
  assets: {
    label: "Assets",
    color: "#0ea5e9",
  },
  liabilities: {
    label: "Liabilities",
    color: "#f97316",
  },
  equity: {
    label: "Equity",
    color: "#22c55e",
  },
} satisfies ChartConfig;

const structureConfig = {
  assets: {
    label: "Assets",
    color: "#0ea5e9",
  },
  liabilities: {
    label: "Liabilities",
    color: "#f97316",
  },
  equity: {
    label: "Equity",
    color: "#22c55e",
  },
} satisfies ChartConfig;

export function BalanceSheetOverview({ report }: BalanceSheetOverviewProps) {
  const [showDetails, setShowDetails] = useState(false);
  const latestMonth = report.months[report.months.length - 1];

  const latestAssets = report.totalAssets.values[latestMonth.key] || 0;
  const latestLiabilities = report.totalLiabilities.values[latestMonth.key] || 0;
  const latestEquity = report.totalEquity.values[latestMonth.key] || 0;
  const latestGap = report.equationGap.values[latestMonth.key] || 0;

  const currentRatio = latestLiabilities === 0 ? null : latestAssets / latestLiabilities;
  const liabilitiesShare = latestAssets === 0 ? 0 : (latestLiabilities / latestAssets) * 100;
  const isBalanced = Math.abs(latestGap) < 0.01;

  const handleExportCsv = () => {
    const rows: string[] = [];
    rows.push(["Balance Sheet", ...report.months.map((m) => m.label)].join(","));
    rows.push("");

    const pushSection = (title: string, sectionRows: typeof report.assetRows) => {
      rows.push(title);
      for (const row of sectionRows) {
        if (row.rowType === "section") {
          rows.push(`"${row.label}"`);
          continue;
        }

        rows.push([
          `"${row.label}"`,
          ...report.months.map((m) => (row.values[m.key] || 0).toFixed(2)),
        ].join(","));
      }
      rows.push("");
    };

    pushSection("Assets", report.assetRows);
    rows.push([
      `"${report.totalAssets.label}"`,
      ...report.months.map((m) => (report.totalAssets.values[m.key] || 0).toFixed(2)),
    ].join(","));
    rows.push("");

    pushSection("Liabilities", report.liabilityRows);
    rows.push([
      `"${report.totalLiabilities.label}"`,
      ...report.months.map((m) => (report.totalLiabilities.values[m.key] || 0).toFixed(2)),
    ].join(","));
    rows.push("");

    pushSection("Equity", report.equityRows);
    rows.push([
      `"${report.totalEquity.label}"`,
      ...report.months.map((m) => (report.totalEquity.values[m.key] || 0).toFixed(2)),
    ].join(","));
    rows.push([
      `"${report.equationGap.label}"`,
      ...report.months.map((m) => (report.equationGap.values[m.key] || 0).toFixed(2)),
    ].join(","));

    const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `balance-sheet-${latestMonth.key}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Snapshot</Badge>
          <p className="text-sm text-muted-foreground">Month-end balances on cash basis assumptions</p>
        </div>

        <Button variant="outline" className="gap-2" onClick={handleExportCsv}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Data assumptions for this version</AlertTitle>
        <AlertDescription>
          Cash in bank is from deposits marked confirmed or reconciled. GCash wallet is estimated from GCash-tagged inflows minus GCash expenses and GCash-to-bank transfers.
          Inventory uses current product quantity valued at latest known purchase cost up to each month.
          Purchase order and expense statuses are current-state values, so older months are useful for trend, not final audited books.
          Equation Check now reflects unresolved equity differences that still need formal capital or adjustment entries.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Assets"
          value={compactCurrency(latestAssets)}
          icon={Wallet}
          variant="default"
          subtitle={currency(latestAssets)}
        />
        <SummaryCard
          title="Total Liabilities"
          value={compactCurrency(latestLiabilities)}
          icon={ShieldAlert}
          variant={latestLiabilities > latestAssets ? "destructive" : "warning"}
          subtitle={`${liabilitiesShare.toFixed(1)}% of assets`}
        />
        <SummaryCard
          title="Total Equity"
          value={compactCurrency(latestEquity)}
          icon={Scale}
          variant={latestEquity >= 0 ? "success" : "destructive"}
          subtitle={currentRatio === null ? "No liabilities" : `Current ratio: ${currentRatio.toFixed(2)}`}
        />
        <SummaryCard
          title="Equation Check"
          value={currency(latestGap)}
          icon={isBalanced ? Scale : AlertCircle}
          variant={isBalanced ? "success" : "destructive"}
          subtitle={isBalanced ? "Balanced" : "Needs review"}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Balance Sheet Trend</CardTitle>
            <CardDescription>Assets, liabilities, and equity by month</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendConfig} className="h-[320px] w-full">
              <LineChart data={report.trendSeries} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrency(Number(value))} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => currency(Number(value))} />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="assets" stroke="var(--color-assets)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="liabilities" stroke="var(--color-liabilities)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="equity" stroke="var(--color-equity)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capital Structure</CardTitle>
            <CardDescription>Liabilities and equity composition</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={structureConfig} className="h-[320px] w-full">
              <AreaChart data={report.trendSeries} margin={{ left: 8, right: 8, top: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => compactCurrency(Number(value))} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => currency(Number(value))} />} />
                <Area type="monotone" dataKey="liabilities" stackId="a" fill="var(--color-liabilities)" stroke="var(--color-liabilities)" fillOpacity={0.35} />
                <Area type="monotone" dataKey="equity" stackId="a" fill="var(--color-equity)" stroke="var(--color-equity)" fillOpacity={0.35} />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Collapsible open={showDetails} onOpenChange={setShowDetails}>
        <div className="flex items-center justify-between rounded-lg border bg-card p-4">
          <div>
            <h3 className="font-semibold">Detailed Statement</h3>
            <p className="text-sm text-muted-foreground">Full balance sheet table for month-by-month checking</p>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              {showDetails ? "Hide details" : "Show details"}
              <ChevronDown className={`h-4 w-4 transition-transform ${showDetails ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="pt-4">
          <BalanceSheetTable report={report} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
