import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

export interface Employee {
  id: string;
  name: string;
  role: string | null;
  hourly_rate: number | null;
  has_pin: boolean;
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
      let request = (supabase as any)
        .from("employees")
        .select("id,name,role,hourly_rate,is_active,created_at,updated_at,pin_hash")
        .order("name", { ascending: true });
      if (!includeInactive) {
        request = request.eq("is_active", true);
      }
      const { data, error } = await request;
      if (error) throw error;

      const mapped: Employee[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        role: row.role,
        hourly_rate: row.hourly_rate,
        has_pin: !!row.pin_hash,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
      }));

      setEmployees(mapped);
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
      const pin = data.pin?.trim() ? data.pin.trim() : null;
      const payload = {
        name: data.name,
        role: data.role ?? null,
        hourly_rate: data.hourly_rate ?? null,
        is_active: data.is_active ?? true,
        pin: null,
      };

      const { data: inserted, error } = await (supabase as any)
        .from("employees")
        .insert([payload])
        .select("id")
        .single();

      if (error) throw error;

      if (pin) {
        const { error: pinError } = await (supabase as any).rpc("set_employee_pin", {
          p_employee_id: inserted.id,
          p_pin: pin,
        });
        if (pinError) throw pinError;
      }

      toast({ title: "Success", description: "Employee added" });
      await fetchRef.current();
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
      const pinProvided = Object.prototype.hasOwnProperty.call(data, "pin");
      const pin = data.pin?.trim() ? data.pin.trim() : null;

      const payload: Partial<CreateEmployeeData> = { ...data };
      delete payload.pin;

      const { error } = await supabase.from("employees").update(payload).eq("id", id);
      if (error) throw error;

      if (pinProvided) {
        const { error: pinError } = await (supabase as any).rpc("set_employee_pin", {
          p_employee_id: id,
          p_pin: pin,
        });
        if (pinError) throw pinError;
      }

      toast({ title: "Success", description: "Employee updated" });
      await fetchRef.current();
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
