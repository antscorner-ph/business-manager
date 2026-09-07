import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProfitLossReport, ProfitLossRow } from "@/hooks/useProfitAndLoss";

interface ProfitLossTableProps {
  report: ProfitLossReport;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);

const renderDataRow = (
  row: ProfitLossRow,
  monthKeys: string[],
  rowClassName = "",
  stickyClassName = "bg-background"
) => (
  <TableRow key={row.label} className={rowClassName}>
    <TableCell className={`font-medium sticky left-0 ${stickyClassName}`}>{row.label}</TableCell>
    {monthKeys.map((monthKey) => (
      <TableCell key={`${row.label}-${monthKey}`} className="text-right">
        {formatCurrency(row.values[monthKey] || 0)}
      </TableCell>
    ))}
  </TableRow>
);

export function ProfitLossTable({ report }: ProfitLossTableProps) {
  const monthKeys = report.months.map((m) => m.key);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profit and Loss Statement</CardTitle>
        <CardDescription>
          Monthly revenue, expenses, and net income or loss
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[260px] sticky left-0 bg-background">
                  Profit and Loss Item
                </TableHead>
                {report.months.map((month) => (
                  <TableHead key={month.key} className="text-right min-w-[170px]">
                    {month.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-semibold sticky left-0 bg-muted/40">Revenue</TableCell>
                {monthKeys.map((monthKey) => (
                  <TableCell key={`rev-section-${monthKey}`} className="bg-muted/20" />
                ))}
              </TableRow>

              {report.revenueRows.map((row) => renderDataRow(row, monthKeys))}

              {renderDataRow(
                report.totalRevenue,
                monthKeys,
                "bg-primary/10",
                "bg-primary/10 font-semibold"
              )}

              <TableRow>
                <TableCell className="font-semibold sticky left-0 bg-muted/40">Expenses</TableCell>
                {monthKeys.map((monthKey) => (
                  <TableCell key={`exp-section-${monthKey}`} className="bg-muted/20" />
                ))}
              </TableRow>

              {report.expenseRows.map((row) => {
                if (row.rowType === "section") {
                  return (
                    <TableRow key={row.label}>
                      <TableCell className="font-semibold sticky left-0 bg-muted/30">{row.label}</TableCell>
                      {monthKeys.map((monthKey) => (
                        <TableCell key={`${row.label}-${monthKey}`} className="bg-muted/10" />
                      ))}
                    </TableRow>
                  );
                }

                return renderDataRow(row, monthKeys);
              })}

              {renderDataRow(
                report.totalExpenses,
                monthKeys,
                "bg-destructive/10",
                "bg-destructive/10 font-semibold"
              )}

              <TableRow className="bg-success/10">
                <TableCell className="font-bold sticky left-0 bg-success/10">{report.netIncome.label}</TableCell>
                {monthKeys.map((monthKey) => {
                  const value = report.netIncome.values[monthKey] || 0;
                  return (
                    <TableCell
                      key={`net-income-${monthKey}`}
                      className={`text-right font-bold ${value < 0 ? "text-destructive" : "text-success"}`}
                    >
                      {formatCurrency(value)}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
