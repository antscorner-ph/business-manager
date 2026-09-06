import { PurchaseOrdersManager } from "@/components/PurchaseOrdersManager";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { SummaryCard } from "@/components/SummaryCard";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { ShoppingCart, CheckCircle2, Clock, DollarSign } from "lucide-react";

const PurchaseOrders = () => {
  const {
    purchaseOrders,
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

  const totalAmount = purchaseOrders.reduce((sum, po) => sum + po.total_amount, 0);
  const totalPaid = purchaseOrders
    .filter((po) => po.payment_status === "paid")
    .reduce((sum, po) => sum + po.total_amount, 0);
  const totalUnpaid = purchaseOrders
    .filter((po) => po.payment_status === "unpaid")
    .reduce((sum, po) => sum + po.total_amount, 0);
  const totalPartial = purchaseOrders
    .filter((po) => po.payment_status === "partial")
    .reduce((sum, po) => sum + po.total_amount, 0);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Purchase Orders"
        description="Handle supplier orders and payment tracking"
      />

      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <SummaryCard
          title="Total Amount"
          value={formatCurrency(totalAmount)}
          icon={ShoppingCart}
        />
        <SummaryCard
          title="Total Paid"
          value={formatCurrency(totalPaid)}
          icon={CheckCircle2}
        />
        <SummaryCard
          title="Total Unpaid"
          value={formatCurrency(totalUnpaid)}
          icon={Clock}
        />
        <SummaryCard
          title="Total Partial"
          value={formatCurrency(totalPartial)}
          icon={DollarSign}
        />
      </div>

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
