import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Employee {
  id: string;
  name: string;
  role: string | null;
  hourly_rate: number | null;
  pin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateEmployeeData {
  name: string;
  role?: string | null;
  hourly_rate?: number | null;
  pin?: string | null;
  is_active?: boolean;
}

/**
 * Manage the local employee list used for time-keeping.
 * By default only active employees are returned; pass includeInactive for management views.
 */
export const useEmployees = (includeInactive = false) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      let request = supabase.from("employees").select("*").order("name", { ascending: true });
      if (!includeInactive) {
        request = request.eq("is_active", true);
      }
      const { data, error } = await request;
      if (error) throw error;
      setEmployees(data || []);
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  const fetchRef = useRef(fetchEmployees);
  useEffect(() => {
    fetchRef.current = fetchEmployees;
  }, [fetchEmployees]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    const channel = supabase
      .channel("employees_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => fetchRef.current()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const addEmployee = async (data: CreateEmployeeData) => {
    try {
      const { error } = await supabase.from("employees").insert([data]);
      if (error) throw error;
      toast({ title: "Success", description: "Employee added" });
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add employee",
        variant: "destructive",
      });
      return false;
    }
  };

  const updateEmployee = async (id: string, data: Partial<CreateEmployeeData>) => {
    try {
      const { error } = await supabase.from("employees").update(data).eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Employee updated" });
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update employee",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteEmployee = async (id: string) => {
    try {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Success", description: "Employee removed" });
      return true;
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove employee",
        variant: "destructive",
      });
      return false;
    }
  };

  return { employees, loading, addEmployee, updateEmployee, deleteEmployee, refetch: () => fetchRef.current() };
};
