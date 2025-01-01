import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceivablesManager } from "@/components/ReceivablesManager";
import { BankDepositsManager } from "@/components/BankDepositsManager";
import { PurchaseOrdersManager } from "@/components/PurchaseOrdersManager";
import { useReceivables } from "@/hooks/useReceivables";
import { useBankDeposits } from "@/hooks/useBankDeposits";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useSearchParams } from "react-router-dom";

const Financial = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "receivables";

  const {
    receivables,
    totalCount: receivablesTotalCount,
    query: receivablesQuery,
    setQuery: setReceivablesQuery,
    loading: receivablesLoading,
    addReceivable,
    addPayment,
    updateStatus: updateReceivableStatus,
  } = useReceivables();

  const {
    deposits,
    depositItems,
    totalCount: depositsTotalCount,
    query: depositsQuery,
    setQuery: setDepositsQuery,
    loading: depositsLoading,
    addDeposit,
    addDepositItem,
    updateStatus: updateDepositStatus,
  } = useBankDeposits();

  const {
    purchaseOrders,
    totalCount: purchaseOrdersTotalCount,
    query: purchaseOrdersQuery,
    setQuery: setPurchaseOrdersQuery,
    loading: purchaseOrdersLoading,
    addPurchaseOrder,
    updatePurchaseOrder,
    updatePaymentStatus,
    updateStatus: updatePurchaseOrderStatus,
    deletePurchaseOrder,
  } = usePurchaseOrders();

  if (receivablesLoading || depositsLoading || purchaseOrdersLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
          <p className="text-muted-foreground">
            Manage receivables, bank deposits, and purchase orders
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setSearchParams({ tab: value })} className="w-full">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="receivables">Receivables</TabsTrigger>
            <TabsTrigger value="deposits">Bank Deposits</TabsTrigger>
            <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="receivables" className="mt-6">
            <ReceivablesManager
              receivables={receivables}
              totalCount={receivablesTotalCount}
              query={receivablesQuery}
              onQueryChange={setReceivablesQuery}
              onAddReceivable={addReceivable}
              onAddPayment={addPayment}
              onUpdateStatus={updateReceivableStatus}
            />
          </TabsContent>

          <TabsContent value="deposits" className="mt-6">
            <BankDepositsManager
              deposits={deposits}
              depositItems={depositItems}
              totalCount={depositsTotalCount}
              query={depositsQuery}
              onQueryChange={setDepositsQuery}
              onAddDeposit={addDeposit}
              onAddDepositItem={addDepositItem}
              onUpdateStatus={updateDepositStatus}
            />
          </TabsContent>

          <TabsContent value="purchase-orders" className="mt-6">
            <PurchaseOrdersManager
              purchaseOrders={purchaseOrders}
              totalCount={purchaseOrdersTotalCount}
              query={purchaseOrdersQuery}
              onQueryChange={setPurchaseOrdersQuery}
              onAddPurchaseOrder={addPurchaseOrder}
              onUpdatePurchaseOrder={updatePurchaseOrder}
              onUpdatePaymentStatus={updatePaymentStatus}
              onUpdateStatus={updatePurchaseOrderStatus}
              onDeletePurchaseOrder={deletePurchaseOrder}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Financial;
