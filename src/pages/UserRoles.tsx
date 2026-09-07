import { useMemo, useState } from "react";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useUserRoles, type AppRole } from "@/hooks/useUserRoles";
import { formatDateTime } from "@/lib/utils";

const roleBadgeVariant: Record<AppRole, "default" | "secondary" | "destructive" | "outline"> = {
  owner: "destructive",
  manager: "default",
  staff: "secondary",
};

const UserRoles = () => {
  const { roles, currentUserId, currentUserRole, loading, upsertRole, deleteRole } = useUserRoles();

  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<AppRole>("staff");
  const hasAnyRole = roles.length > 0;
  const canBootstrapOwner = !hasAnyRole && !!currentUserId;
  const canManage = currentUserRole === "owner";

  const myRoleLabel = useMemo(() => {
    if (!currentUserRole) return "No role assigned";
    if (currentUserRole === "owner") return "Owner";
    if (currentUserRole === "manager") return "Manager";
    return "Staff";
  }, [currentUserRole]);

  const handleSave = async () => {
    const normalized = userId.trim();
    if (!normalized) return;
    await upsertRole(normalized, role);
    setUserId("");
    setRole("staff");
  };

  const handleBootstrapOwner = async () => {
    if (!currentUserId) return;
    await upsertRole(currentUserId, "owner");
  };

  if (loading) return <PageLoader />;

  return (
    <PageContainer>
      <PageHeader
        title="User Roles"
        description="Manage owner, manager, and staff access"
        actions={<Badge variant="outline">Your Role: {myRoleLabel}</Badge>}
      />

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Assignment</CardTitle>
            <CardDescription>
              Roles are stored in Supabase table user_roles. Use Supabase Auth user id as the key.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {canBootstrapOwner ? (
              <div className="rounded-md border bg-muted/20 p-4 space-y-3">
                <p className="text-sm">
                  No roles exist yet. Click below to assign your current account as the first owner.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Current User ID: {currentUserId}</Badge>
                  <Button onClick={handleBootstrapOwner}>Assign Me as Owner</Button>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
              <Input
                placeholder="User UUID (from Supabase Auth)"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={!canManage || !hasAnyRole}
              />

              <Select
                value={role}
                onValueChange={(value: AppRole) => setRole(value)}
                disabled={!canManage || !hasAnyRole}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Owner</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={handleSave} disabled={!canManage || !hasAnyRole || !userId.trim()}>
                Save Role
              </Button>
            </div>

            {!canManage ? (
              <p className="text-sm text-muted-foreground">
                Only owner can add or edit roles. Managers and staff can only view allowed records.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Roles</CardTitle>
            <CardDescription>Current role mappings by user id</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User ID</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No roles yet. Bootstrap first owner by assigning your user id as owner.
                      </TableCell>
                    </TableRow>
                  ) : (
                    roles.map((row) => {
                      const isMe = currentUserId && row.user_id === currentUserId;
                      return (
                        <TableRow key={row.id}>
                          <TableCell className="font-mono text-xs">{row.user_id}</TableCell>
                          <TableCell>
                            <Badge variant={roleBadgeVariant[row.role]}>{row.role}</Badge>
                          </TableCell>
                          <TableCell>{formatDateTime(row.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!canManage || isMe}
                              onClick={() => void deleteRole(row.id)}
                            >
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
};

export default UserRoles;
