import { ReceivablesManager } from "@/components/ReceivablesManager";
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
          <h1 className="text-3xl font-bold tracking-tight">Receivables</h1>
          <p className="text-muted-foreground">
            Manage customer accounts and payment tracking
          </p>
        </div>

        <ReceivablesManager
          receivables={receivables}
          totalCount={totalCount}
          query={query}
          onQueryChange={setQuery}
          onAddReceivable={addReceivable}
          onAddPayment={addPayment}
          onUpdateStatus={updateStatus}
        />
      </main>
    </div>
  );
};

export default Receivables;
