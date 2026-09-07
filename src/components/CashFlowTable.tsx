import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CashFlowReport, CashFlowRow, CashFlowSourceMode } from "@/hooks/useCashFlow";

interface CashFlowTableProps {
  report: CashFlowReport;
  sourceMode: CashFlowSourceMode;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);

const renderRow = (row: CashFlowRow, monthKeys: string[]) => (
  <TableRow key={row.label}>
    <TableCell className="font-medium sticky left-0 bg-background">{row.label}</TableCell>
    {monthKeys.map((monthKey) => (
      <TableCell key={`${row.label}-${monthKey}`} className="text-right">
        {formatCurrency(row.values[monthKey] || 0)}
      </TableCell>
    ))}
  </TableRow>
);

export function CashFlowTable({ report, sourceMode }: CashFlowTableProps) {
  const monthKeys = report.months.map((m) => m.key);

  const sourceModeMessage =
    sourceMode === "expenses_only"
      ? "Outflow uses paid expenses only. This avoids double counting with daily cash-out entries."
      : sourceMode === "daily_cash_out_only"
      ? "Outflow uses Daily Sales cash-out only."
      : "Outflow combines paid expenses and Daily Sales cash-out entries. Use this only if those streams are guaranteed distinct.";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cash Flow</CardTitle>
        <CardDescription>
          Monthly view of inflows, outflows, and net cash movement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {sourceModeMessage}
          </AlertDescription>
        </Alert>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px] sticky left-0 bg-background">Cash Flow Item</TableHead>
                {report.months.map((month) => (
                  <TableHead key={month.key} className="text-right min-w-[160px]">
                    {month.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold sticky left-0 bg-muted/40">Cash inflow</TableCell>
                {monthKeys.map((monthKey) => (
                  <TableCell key={`inflow-${monthKey}`} className="bg-muted/20" />
                ))}
              </TableRow>

              {report.inflowRows.map((row) => renderRow(row, monthKeys))}

              <TableRow className="bg-muted/40">
                <TableCell className="font-semibold sticky left-0 bg-muted/40">{report.openingBalance.label}</TableCell>
                {monthKeys.map((monthKey) => (
                  <TableCell key={`opening-${monthKey}`} className="text-right font-semibold">
                    {formatCurrency(report.openingBalance.values[monthKey] || 0)}
                  </TableCell>
                ))}
              </TableRow>

              <TableRow className="bg-primary/10">
                <TableCell className="font-semibold sticky left-0 bg-primary/10">{report.totalInflow.label}</TableCell>
                {monthKeys.map((monthKey) => (
                  <TableCell key={`total-inflow-${monthKey}`} className="text-right font-semibold">
                    {formatCurrency(report.totalInflow.values[monthKey] || 0)}
                  </TableCell>
                ))}
              </TableRow>

              <TableRow>
                <TableCell className="font-semibold sticky left-0 bg-muted/40">Cash outflow</TableCell>
                {monthKeys.map((monthKey) => (
                  <TableCell key={`outflow-${monthKey}`} className="bg-muted/20" />
                ))}
              </TableRow>

              {report.outflowRows.map((row) => renderRow(row, monthKeys))}

              <TableRow className="bg-destructive/10">
                <TableCell className="font-semibold sticky left-0 bg-destructive/10">{report.totalOutflow.label}</TableCell>
                {monthKeys.map((monthKey) => (
                  <TableCell key={`total-outflow-${monthKey}`} className="text-right font-semibold">
                    {formatCurrency(report.totalOutflow.values[monthKey] || 0)}
                  </TableCell>
                ))}
              </TableRow>

              <TableRow className="bg-success/10">
                <TableCell className="font-bold sticky left-0 bg-success/10">{report.netFlow.label}</TableCell>
                {monthKeys.map((monthKey) => {
                  const value = report.netFlow.values[monthKey] || 0;
                  return (
                    <TableCell
                      key={`net-${monthKey}`}
                      className={`text-right font-bold ${value < 0 ? "text-destructive" : "text-success"}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>

              <TableRow className="bg-muted/40">
                <TableCell className="font-bold sticky left-0 bg-muted/40">{report.endingBalance.label}</TableCell>
                {monthKeys.map((monthKey) => (
                  <TableCell key={`ending-${monthKey}`} className="text-right font-bold">
                    {formatCurrency(report.endingBalance.values[monthKey] || 0)}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
