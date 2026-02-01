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
import BankDeposits from "./pages/BankDeposits";
import PurchaseOrders from "./pages/PurchaseOrders";
import Customers from "./pages/Customers";
import Suppliers from "./pages/Suppliers";
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
                    <Route path="/receivables" element={<Receivables />} />
                    <Route path="/bank-deposits" element={<BankDeposits />} />
                    <Route path="/purchase-orders" element={<PurchaseOrders />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/suppliers" element={<Suppliers />} />
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
