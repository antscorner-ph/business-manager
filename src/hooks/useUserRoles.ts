import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppRole = "owner" | "manager" | "staff";

export interface UserRoleRow {
  id: number;
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export function useUserRoles() {
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      const { data, error } = await (supabase as any)
        .from("user_roles")
        .select("id,user_id,role,created_at,updated_at")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const rows = (data || []) as UserRoleRow[];
      setRoles(rows);

      if (user?.id) {
        const mine = rows.find((row) => row.user_id === user.id);
        setCurrentUserRole(mine?.role ?? null);
      } else {
        setCurrentUserRole(null);
      }
    } catch (error) {
      console.error("Error loading roles:", error);
      toast.error("Failed to load user roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const upsertRole = async (userId: string, role: AppRole) => {
    try {
      const { error } = await (supabase as any)
        .from("user_roles")
        .upsert({ user_id: userId, role }, { onConflict: "user_id" });

      if (error) throw error;

      toast.success("Role saved");
      await loadRoles();
      return true;
    } catch (error) {
      console.error("Error saving role:", error);
      toast.error("Failed to save role");
      return false;
    }
  };

  const deleteRole = async (id: number) => {
    try {
      const { error } = await (supabase as any).from("user_roles").delete().eq("id", id);
      if (error) throw error;

      toast.success("Role removed");
      await loadRoles();
      return true;
    } catch (error) {
      console.error("Error removing role:", error);
      toast.error("Failed to remove role");
      return false;
    }
  };

  return {
    roles,
    currentUserId,
    currentUserRole,
    loading,
    upsertRole,
    deleteRole,
    reload: loadRoles,
  };
}
