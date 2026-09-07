import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Clock, LogIn, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useEmployees } from "@/hooks/useEmployees";
import { useTimeEntries, entryHours, type TimeEntry } from "@/hooks/useTimeEntries";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Employee } from "@/hooks/useEmployees";

const TimeClock = () => {
  const { employees, loading: employeesLoading } = useEmployees(false);
  const { openEntries, loading: entriesLoading, clockIn, clockOut } = useTimeEntries();

  const [now, setNow] = useState(() => new Date());
  const [pinEmployee, setPinEmployee] = useState<Employee | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinAction, setPinAction] = useState<"in" | "out">("in");

  // Live wall clock, refreshed each second.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Map employee_id -> open entry for quick status lookup.
  const openByEmployee = useMemo(() => {
    const map = new Map<string, TimeEntry>();
    for (const entry of openEntries) map.set(entry.employee_id, entry);
    return map;
  }, [openEntries]);

  const performAction = async (employee: Employee, action: "in" | "out") => {
    if (action === "in") await clockIn(employee.id);
    else await clockOut(employee.id);
  };

  const handleToggle = (employee: Employee) => {
    const isIn = openByEmployee.has(employee.id);
    const action: "in" | "out" = isIn ? "out" : "in";
    // If the employee has a PIN, require it before either action.
    if (employee.has_pin) {
      setPinEmployee(employee);
      setPinAction(action);
      setPinInput("");
      return;
    }
    performAction(employee, action);
  };

  const confirmPin = async () => {
    if (!pinEmployee) return;

    const { data: isValid, error } = await (supabase as any).rpc("verify_employee_pin", {
      p_employee_id: pinEmployee.id,
      p_pin: pinInput,
    });

    if (error) {
      toast({ title: "PIN check failed", description: "Please try again.", variant: "destructive" });
      return;
    }

    if (!isValid) {
      toast({ title: "Incorrect PIN", description: "Please try again.", variant: "destructive" });
      return;
    }
    const employee = pinEmployee;
    setPinEmployee(null);
    await performAction(employee, pinAction);
  };

  if ((employeesLoading || entriesLoading) && employees.length === 0) {
    return <PageLoader />;
  }

  const clockedInCount = openByEmployee.size;

  return (
    <PageContainer>
      <PageHeader
        title="Time Clock"
        description={format(now, "EEEE, MMMM d, yyyy")}
        actions={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
              <Clock className="h-5 w-5 text-primary" />
              <span className="font-mono text-lg font-semibold text-primary tabular-nums">
                {format(now, "h:mm:ss a")}
              </span>
            </div>
            <Badge variant="secondary">{clockedInCount} clocked in</Badge>
          </div>
        }
      />

      {employees.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No active employees. Add employees on the Employees page first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((employee) => {
            const openEntry = openByEmployee.get(employee.id);
            const isIn = !!openEntry;
            return (
              <Card key={employee.id} className={isIn ? "border-primary" : undefined}>
                <CardContent className="flex flex-col gap-3 p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{employee.name}</p>
                      {employee.role && (
                        <p className="text-sm text-muted-foreground">{employee.role}</p>
                      )}
                    </div>
                    <Badge variant={isIn ? "default" : "outline"}>
                      {isIn ? "In" : "Out"}
                    </Badge>
                  </div>

                  {isIn && openEntry && (
                    <p className="text-xs text-muted-foreground">
                      Since {format(new Date(openEntry.clock_in), "h:mm a")} ·{" "}
                      {entryHours(openEntry).toFixed(2)} h
                    </p>
                  )}

                  <Button
                    variant={isIn ? "outline" : "default"}
                    onClick={() => handleToggle(employee)}
                    className="w-full"
                  >
                    {isIn ? (
                      <>
                        <LogOut className="mr-2 h-4 w-4" />
                        Clock Out
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Clock In
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* PIN prompt */}
      <Dialog open={!!pinEmployee} onOpenChange={(open) => !open && setPinEmployee(null)}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Enter PIN</DialogTitle>
            <DialogDescription>
              {pinEmployee?.name} · Clock {pinAction === "in" ? "In" : "Out"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoFocus
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirmPin();
              }}
            />
          </div>
          <DialogFooter>
            <Button onClick={confirmPin} className="w-full">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default TimeClock;
