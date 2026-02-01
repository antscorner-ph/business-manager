import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  Users,
  ShoppingCart,
  Landmark,
  BarChart3,
  Package,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
      navigate("/login");
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to log out",
        variant: "destructive",
      });
    }
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-4 py-2">
            <img src="/logo.png" alt="Ant's Corner Logo" className="h-8 w-8 rounded-lg" />
            <div className="flex flex-col">
              <span className="font-semibold text-sm">Ant's Corner</span>
              <span className="text-xs text-muted-foreground">Business Manager</span>
            </div>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/")}>
                    <Link to="/">
                      <LayoutDashboard className="h-4 w-4" />
                      <span>Dashboard</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/reconciliation")}>
                    <Link to="/reconciliation">
                      <Calculator className="h-4 w-4" />
                      <span>Daily Reconciliation</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/receivables")}>
                    <Link to="/receivables">
                      <Users className="h-4 w-4" />
                      <span>Receivables</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/bank-deposits")}>
                    <Link to="/bank-deposits">
                      <Landmark className="h-4 w-4" />
                      <span>Bank Deposits</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/purchase-orders")}>
                    <Link to="/purchase-orders">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Purchase Orders</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/customers")}>
                    <Link to="/customers">
                      <Users className="h-4 w-4" />
                      <span>Customers</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/suppliers")}>
                    <Link to="/suppliers">
                      <Package className="h-4 w-4" />
                      <span>Suppliers</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>

                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/history")}>
                    <Link to="/history">
                      <BarChart3 className="h-4 w-4" />
                      <span>Sales History</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger />
          <div className="h-4 w-px bg-border" />
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </header>
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
