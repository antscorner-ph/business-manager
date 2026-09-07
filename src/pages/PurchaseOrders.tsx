import { PurchaseOrdersManager } from "@/components/PurchaseOrdersManager";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { SummaryCard } from "@/components/SummaryCard";
import { KpiDateRangeFilter } from "@/components/KpiDateRangeFilter";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, AlertTriangle, Clock, Wallet } from "lucide-react";
import { differenceInCalendarDays } from "date-fns";

const PurchaseOrders = () => {
  const {
    purchaseOrders,
    kpiPurchaseOrders,
    totalCount,
    query,
    setQuery,
    loading,
    updatePurchaseOrder,
    updatePaymentStatus,
    updateStatus,
    deletePurchaseOrder,
  } = usePurchaseOrders();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  const today = new Date();

  const setDateRange = (startDate: string, endDate: string) => {
    setQuery({ ...query, startDate, endDate, page: 1 });
  };

  const totalAmount = kpiPurchaseOrders.reduce((sum, po) => sum + po.total_amount, 0);
  const openPayables = kpiPurchaseOrders
    .filter((po) => po.payment_status === "unpaid" || po.payment_status === "partial")
    .reduce((sum, po) => sum + po.total_amount, 0);

  const pendingApprovalValue = kpiPurchaseOrders
    .filter((po) => po.status === "pending")
    .reduce((sum, po) => sum + po.total_amount, 0);

  const pendingOver14Days = kpiPurchaseOrders.filter(
    (po) => po.status === "pending" && differenceInCalendarDays(today, new Date(po.date)) > 14
  );

  const pendingOver14DaysValue = pendingOver14Days
    .reduce((sum, po) => sum + po.total_amount, 0);

  const topSupplierExposure = Object.entries(
    kpiPurchaseOrders
      .filter((po) => po.payment_status === "unpaid" || po.payment_status === "partial")
      .reduce<Record<string, number>>((acc, po) => {
        acc[po.supplier_name] = (acc[po.supplier_name] || 0) + po.total_amount;
        return acc;
      }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const paymentMix = kpiPurchaseOrders.reduce(
    (acc, po) => {
      acc[po.payment_status] += 1;
      return acc;
    },
    { unpaid: 0, partial: 0, paid: 0 }
  );

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Purchase Orders"
        description="Handle supplier orders and payment tracking"
      />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <KpiDateRangeFilter
            value={{ startDate: query.startDate, endDate: query.endDate }}
            onChange={(next) => setDateRange(next.startDate, next.endDate)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <SummaryCard
          title="Committed Spend"
          value={formatCurrency(totalAmount)}
          icon={ShoppingCart}
        />
        <SummaryCard
          title="Open Payables"
          value={formatCurrency(openPayables)}
          icon={Wallet}
          variant={openPayables > 0 ? "warning" : "success"}
        />
        <SummaryCard
          title="Pending Approval"
          value={formatCurrency(pendingApprovalValue)}
          icon={Clock}
          variant={pendingApprovalValue > 0 ? "warning" : "success"}
        />
        <SummaryCard
          title="Late Pending Orders"
          value={String(pendingOver14Days.length)}
          icon={AlertTriangle}
          variant={pendingOver14Days.length > 0 ? "destructive" : "success"}
          subtitle={`Value at risk: ${formatCurrency(pendingOver14DaysValue)}`}
        />
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Supplier Exposure</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium mb-2">Top Suppliers By Unpaid Exposure</p>
            <div className="space-y-1 text-sm text-muted-foreground">
              {topSupplierExposure.length === 0 ? (
                <p>No open supplier exposure.</p>
              ) : (
                topSupplierExposure.map(([supplierName, amount]) => (
                  <p key={supplierName}>
                    {supplierName}: {formatCurrency(amount)}
                  </p>
                ))
              )}
            </div>
          </div>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Paid POs: {paymentMix.paid}</p>
            <p>Partial POs: {paymentMix.partial}</p>
            <p>Unpaid POs: {paymentMix.unpaid}</p>
          </div>
        </CardContent>
      </Card>

      <PurchaseOrdersManager
        purchaseOrders={purchaseOrders}
        totalCount={totalCount}
        query={query}
        onQueryChange={setQuery}
        onUpdatePurchaseOrder={updatePurchaseOrder}
        onUpdatePaymentStatus={updatePaymentStatus}
        onUpdateStatus={updateStatus}
        onDeletePurchaseOrder={deletePurchaseOrder}
      />
    </PageContainer>
  );
};

export default PurchaseOrders;
