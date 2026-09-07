import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import DailyReconciliation from "./pages/DailyReconciliation";
import History from "./pages/History";
import Receivables from "./pages/Receivables";
import Payables from "./pages/Payables";
import Expenses from "./pages/Expenses";
import CashFlow from "./pages/CashFlow";
import ProfitLoss from "./pages/ProfitLoss";
import BalanceSheet from "./pages/BalanceSheet";
import BankDeposits from "./pages/BankDeposits";
import PurchaseOrders from "./pages/PurchaseOrders";
import GeneratePurchaseOrder from "./pages/GeneratePurchaseOrder";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import TimeClock from "./pages/TimeClock";
import Timesheets from "./pages/Timesheets";
import Employees from "./pages/Employees";
import UserRoles from "./pages/UserRoles";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/reconciliation" element={<DailyReconciliation />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/cash-flow" element={<CashFlow />} />
                    <Route path="/profit-loss" element={<ProfitLoss />} />
                    <Route path="/balance-sheet" element={<BalanceSheet />} />
                    <Route path="/receivables" element={<Receivables />} />
                    <Route path="/payables" element={<Payables />} />
                    <Route path="/expenses" element={<Expenses />} />
                    <Route path="/bank-deposits" element={<BankDeposits />} />
                    <Route path="/purchase-orders/new" element={<GeneratePurchaseOrder />} />
                    <Route path="/purchase-orders" element={<PurchaseOrders />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/suppliers" element={<Suppliers />} />
                    <Route path="/products" element={<Products />} />
                    <Route path="/products/:sku" element={<ProductDetail />} />
                    <Route path="/time-clock" element={<TimeClock />} />
                    <Route path="/timesheets" element={<Timesheets />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/admin/user-roles" element={<UserRoles />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
