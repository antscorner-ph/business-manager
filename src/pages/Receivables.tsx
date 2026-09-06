import { ReceivablesManager } from "@/components/ReceivablesManager";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useReceivables } from "@/hooks/useReceivables";

const Receivables = () => {
  const {
    receivables,
    totalCount,
    query,
    setQuery,
    loading,
    addReceivable,
    addPayment,
    updateStatus,
  } = useReceivables();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Receivables"
        description="Manage customer accounts and payment tracking"
      />

      <ReceivablesManager
        receivables={receivables}
        totalCount={totalCount}
        query={query}
        onQueryChange={setQuery}
        onAddReceivable={addReceivable}
        onAddPayment={addPayment}
        onUpdateStatus={updateStatus}
      />
    </PageContainer>
  );
};

export default Receivables;
