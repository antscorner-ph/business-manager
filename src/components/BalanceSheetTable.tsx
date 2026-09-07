import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BalanceSheetReport, BalanceSheetRow } from "@/hooks/useBalanceSheet";

interface BalanceSheetTableProps {
  report: BalanceSheetReport;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(amount);

const renderDataRow = (
  row: BalanceSheetRow,
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

export function BalanceSheetTable({ report }: BalanceSheetTableProps) {
  const monthKeys = report.months.map((m) => m.key);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Sheet Statement</CardTitle>
        <CardDescription>
          Month-end snapshot of assets, liabilities, and equity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[320px] sticky left-0 bg-background">
                  Balance Sheet Item
                </TableHead>
                {report.months.map((month) => (
                  <TableHead key={month.key} className="text-right min-w-[170px]">
                    {month.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>

            <TableBody>
              {report.assetRows.map((row) => {
                if (row.rowType === "section") {
                  return (
                    <TableRow key={row.label}>
                      <TableCell className="font-semibold sticky left-0 bg-muted/40">{row.label}</TableCell>
                      {monthKeys.map((monthKey) => (
                        <TableCell key={`${row.label}-${monthKey}`} className="bg-muted/20" />
                      ))}
                    </TableRow>
                  );
                }

                return renderDataRow(row, monthKeys);
              })}

              {renderDataRow(
                report.totalAssets,
                monthKeys,
                "bg-primary/10",
                "bg-primary/10 font-semibold"
              )}

              {report.liabilityRows.map((row) => {
                if (row.rowType === "section") {
                  return (
                    <TableRow key={row.label}>
                      <TableCell className="font-semibold sticky left-0 bg-muted/40">{row.label}</TableCell>
                      {monthKeys.map((monthKey) => (
                        <TableCell key={`${row.label}-${monthKey}`} className="bg-muted/20" />
                      ))}
                    </TableRow>
                  );
                }

                return renderDataRow(row, monthKeys);
              })}

              {renderDataRow(
                report.totalLiabilities,
                monthKeys,
                "bg-destructive/10",
                "bg-destructive/10 font-semibold"
              )}

              {report.equityRows.map((row) => {
                if (row.rowType === "section") {
                  return (
                    <TableRow key={row.label}>
                      <TableCell className="font-semibold sticky left-0 bg-muted/40">{row.label}</TableCell>
                      {monthKeys.map((monthKey) => (
                        <TableCell key={`${row.label}-${monthKey}`} className="bg-muted/20" />
                      ))}
                    </TableRow>
                  );
                }

                return renderDataRow(row, monthKeys);
              })}

              <TableRow className="bg-success/10">
                <TableCell className="font-bold sticky left-0 bg-success/10">
                  {report.totalEquity.label}
                </TableCell>
                {monthKeys.map((monthKey) => (
                  <TableCell key={`total-equity-${monthKey}`} className="text-right font-bold text-success">
                    {formatCurrency(report.totalEquity.values[monthKey] || 0)}
                  </TableCell>
                ))}
              </TableRow>

              <TableRow>
                <TableCell className="font-semibold sticky left-0 bg-background">
                  {report.equationGap.label}
                </TableCell>
                {monthKeys.map((monthKey) => {
                  const value = report.equationGap.values[monthKey] || 0;
                  const isBalanced = Math.abs(value) < 0.01;
                  return (
                    <TableCell
                      key={`equation-gap-${monthKey}`}
                      className={`text-right font-semibold ${isBalanced ? "text-success" : "text-destructive"}`}
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
