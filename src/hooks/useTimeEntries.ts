import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface TimeEntry {
  id: string;
  employee_id: string;
  clock_in: string;
  clock_out: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

/** Hours between clock_in and clock_out (or now if still open), rounded to 2 decimals. */
export const entryHours = (entry: Pick<TimeEntry, "clock_in" | "clock_out">): number => {
  const start = new Date(entry.clock_in).getTime();
  const end = entry.clock_out ? new Date(entry.clock_out).getTime() : Date.now();
  const hours = (end - start) / (1000 * 60 * 60);
  return Math.max(0, Number(hours.toFixed(2)));
};

/**
 * Tracks currently-open time entries (employees clocked in) and exposes
 * clock in/out plus timesheet range queries.
 */
export const useTimeEntries = () => {
  const [openEntries, setOpenEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOpenEntries = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .is("clock_out", null)
        .order("clock_in", { ascending: true });
      if (error) throw error;
      setOpenEntries(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load time entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRef = useRef(fetchOpenEntries);
  useEffect(() => {
    fetchRef.current = fetchOpenEntries;
  }, [fetchOpenEntries]);

  useEffect(() => {
    fetchOpenEntries();
  }, [fetchOpenEntries]);

  useEffect(() => {
    const channel = supabase
      .channel("time_entries_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "time_entries" },
        () => fetchRef.current()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const clockIn = async (employeeId: string) => {
    try {
      const { error } = await supabase
        .from("time_entries")
        .insert([{ employee_id: employeeId }]);
      // Unique partial index guarantees at most one open entry per employee.
      if (error) {
        if (error.code === "23505") {
          throw new Error("This employee is already clocked in.");
        }
        throw error;
      }
      toast({ title: "Clocked in", description: "Have a great shift!" });
      await fetchOpenEntries();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Clock in failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return false;
    }
  };

  const clockOut = async (employeeId: string) => {
    try {
      const { data: open, error: findError } = await supabase
        .from("time_entries")
        .select("id")
        .eq("employee_id", employeeId)
        .is("clock_out", null)
        .maybeSingle();
      if (findError) throw findError;
      if (!open) throw new Error("This employee is not clocked in.");

      const { error } = await supabase
        .from("time_entries")
        .update({ clock_out: new Date().toISOString() })
        .eq("id", open.id);
      if (error) throw error;

      toast({ title: "Clocked out", description: "See you next time!" });
      await fetchOpenEntries();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Clock out failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      return false;
    }
  };

  /** Fetch entries overlapping [startISO, endISO], optionally for one employee. */
  const getEntriesInRange = useCallback(
    async (startISO: string, endISO: string, employeeId?: string): Promise<TimeEntry[]> => {
      try {
        let request = supabase
          .from("time_entries")
          .select("*")
          .gte("clock_in", startISO)
          .lte("clock_in", endISO)
          .order("clock_in", { ascending: false });
        if (employeeId) request = request.eq("employee_id", employeeId);
        const { data, error } = await request;
        if (error) throw error;
        return data || [];
      } catch (error: unknown) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load timesheet",
          variant: "destructive",
        });
        return [];
      }
    },
    []
  );

  const updateEntry = async (
    id: string,
    updates: Partial<Pick<TimeEntry, "clock_in" | "clock_out" | "note">>
  ) => {
    try {
      const { error } = await supabase.from("time_entries").update(updates).eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Time entry updated" });
      await fetchOpenEntries();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update entry",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteEntry = async (id: string) => {
    try {
      const { error } = await supabase.from("time_entries").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Time entry deleted" });
      await fetchOpenEntries();
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete entry",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    openEntries,
    loading,
    clockIn,
    clockOut,
    getEntriesInRange,
    updateEntry,
    deleteEntry,
    refetch: () => fetchRef.current(),
  };
};
