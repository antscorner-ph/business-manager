import { BankDepositsManager } from "@/components/BankDepositsManager";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useBankDeposits } from "@/hooks/useBankDeposits";

const BankDeposits = () => {
  const {
    deposits,
    depositItems,
    totalCount,
    query,
    setQuery,
    loading,
    addDeposit,
    addDepositItem,
    updateStatus,
  } = useBankDeposits();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Bank Deposits"
        description="Manage deposit records with itemized breakdowns"
      />

      <BankDepositsManager
        deposits={deposits}
        depositItems={depositItems}
        totalCount={totalCount}
        query={query}
        onQueryChange={setQuery}
        onAddDeposit={addDeposit}
        onAddDepositItem={addDepositItem}
        onUpdateStatus={updateStatus}
      />
    </PageContainer>
  );
};

export default BankDeposits;
