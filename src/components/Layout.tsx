import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calculator,
  ShoppingCart,
  Landmark,
  History as HistoryIcon,
  BarChart3,
  FileBarChart,
  Scale,
  HandCoins,
  ReceiptText,
  Contact,
  Truck,
  Package,
  Clock,
  CalendarClock,
  UsersRound,
  Shield,
  CreditCard,
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
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

interface NavItem {
  title: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

/**
 * Navigation grouped by the store's daily workflow:
 * record sales -> reconcile & deposit -> track money owed -> manage contacts -> review records.
 */
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Daily Operations",
    items: [
      { title: "Dashboard", path: "/", icon: LayoutDashboard },
      { title: "Daily Reconciliation", path: "/reconciliation", icon: Calculator },
      { title: "Bank Deposits", path: "/bank-deposits", icon: Landmark },
      { title: "Purchase Orders", path: "/purchase-orders", icon: ShoppingCart },
    ],
  },
  {
    label: "Money Tracking",
    items: [
      { title: "Receivables", path: "/receivables", icon: HandCoins },
      { title: "Payables", path: "/payables", icon: CreditCard },
      { title: "Expenses", path: "/expenses", icon: ReceiptText },
    ],
  },
  {
    label: "Directory",
    items: [
      { title: "Products", path: "/products", icon: Package },
      { title: "Customers", path: "/customers", icon: Contact },
      { title: "Suppliers", path: "/suppliers", icon: Truck },
    ],
  },
  {
    label: "Time Keeping",
    items: [
      { title: "Time Clock", path: "/time-clock", icon: Clock },
      { title: "Timesheets", path: "/timesheets", icon: CalendarClock },
      { title: "Employees", path: "/employees", icon: UsersRound },
    ],
  },
  {
    label: "Records",
    items: [
      { title: "Sales History", path: "/history", icon: HistoryIcon },
      { title: "Cash Flow", path: "/cash-flow", icon: BarChart3 },
      { title: "Profit and Loss", path: "/profit-loss", icon: FileBarChart },
      { title: "Balance Sheet", path: "/balance-sheet", icon: Scale },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "User Roles", path: "/admin/user-roles", icon: Shield },
    ],
  },
];

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path;

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
          {NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild isActive={isActive(item.path)}>
                          <Link to={item.path}>
                            <Icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          ))}
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
