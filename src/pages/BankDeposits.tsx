import { BankDepositsManager } from "@/components/BankDepositsManager";
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Bank Deposits</h1>
          <p className="text-muted-foreground">
            Manage deposit records with itemized breakdowns
          </p>
        </div>

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
      </main>
    </div>
  );
};

export default BankDeposits;
