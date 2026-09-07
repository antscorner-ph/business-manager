import { useCallback, useEffect, useMemo, useState } from "react";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeEntries, entryHours, type TimeEntry } from "@/hooks/useTimeEntries";
import { printTimesheet } from "@/lib/printTimesheet";
import { toast } from "@/hooks/use-toast";

const ALL = "all";
const toISOStart = (date: string) => new Date(`${date}T00:00:00`).toISOString();
const toISOEnd = (date: string) => new Date(`${date}T23:59:59.999`).toISOString();

const Timesheets = () => {
  const { employees } = useEmployees(true);
  const { getEntriesInRange } = useTimeEntries();

  const [startDate, setStartDate] = useState(() =>
    format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [endDate, setEndDate] = useState(() =>
    format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd")
  );
  const [employeeId, setEmployeeId] = useState<string>(ALL);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const employeeById = useMemo(() => {
    const map = new Map(employees.map((e) => [e.id, e]));
    return map;
  }, [employees]);

  const formatCurrency = (amount: number | null) =>
    amount == null
      ? "-"
      : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await getEntriesInRange(
      toISOStart(startDate),
      toISOEnd(endDate),
      employeeId === ALL ? undefined : employeeId
    );
    setEntries(data);
    setLoading(false);
  }, [getEntriesInRange, startDate, endDate, employeeId]);

  useEffect(() => {
    load();
  }, [load]);

  // Derive per-row hours and pay (pay only when the employee has an hourly rate and entry is closed).
  const rows = useMemo(
    () =>
      entries.map((entry) => {
        const employee = employeeById.get(entry.employee_id);
        const hours = entryHours(entry);
        const rate = employee?.hourly_rate ?? null;
        const pay = rate != null && entry.clock_out ? Number((hours * rate).toFixed(2)) : null;
        return { entry, employee, hours, pay };
      }),
    [entries, employeeById]
  );

  const totals = useMemo(() => {
    let hours = 0;
    let pay = 0;
    let hasPay = false;
    for (const r of rows) {
      hours += r.hours;
      if (r.pay != null) {
        pay += r.pay;
        hasPay = true;
      }
    }
    return { hours: Number(hours.toFixed(2)), pay: hasPay ? Number(pay.toFixed(2)) : null };
  }, [rows]);

  const rangeLabel = `${format(new Date(startDate), "MMM d, yyyy")} – ${format(
    new Date(endDate),
    "MMM d, yyyy"
  )}`;

  const handlePrint = () => {
    try {
      printTimesheet({
        title: "Timesheet",
        rangeLabel:
          employeeId === ALL
            ? rangeLabel
            : `${employeeById.get(employeeId)?.name ?? ""} · ${rangeLabel}`,
        rows: rows.map((r) => ({
          employeeName: r.employee?.name ?? "Unknown",
          date: format(new Date(r.entry.clock_in), "MMM d"),
          clockIn: format(new Date(r.entry.clock_in), "h:mm a"),
          clockOut: r.entry.clock_out ? format(new Date(r.entry.clock_out), "h:mm a") : "—",
          hours: r.hours,
          pay: r.pay,
        })),
        totalHours: totals.hours,
        totalPay: totals.pay,
      });
    } catch (error) {
      toast({
        title: "Print failed",
        description: error instanceof Error ? error.message : "Could not open print view.",
        variant: "destructive",
      });
    }
  };

  return (
    <PageContainer>
      <PageHeader
        title="Timesheets"
        description="Hours and pay by date range"
        actions={
          <Button variant="outline" onClick={handlePrint} disabled={rows.length === 0}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="start">From</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">To</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employee">Employee</Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger id="employee">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All employees</SelectItem>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Entries</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead className="text-right">Pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No time entries in this range.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map(({ entry, employee, hours, pay }) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{employee?.name ?? "Unknown"}</TableCell>
                      <TableCell>{format(new Date(entry.clock_in), "MMM d, yyyy")}</TableCell>
                      <TableCell>{format(new Date(entry.clock_in), "h:mm a")}</TableCell>
                      <TableCell>
                        {entry.clock_out ? (
                          format(new Date(entry.clock_out), "h:mm a")
                        ) : (
                          <span className="text-muted-foreground">Still in</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{hours.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(pay)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={4} className="text-right font-semibold">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-bold">{totals.hours.toFixed(2)}</TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(totals.pay)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default Timesheets;
