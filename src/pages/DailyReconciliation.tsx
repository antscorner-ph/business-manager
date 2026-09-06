import { format } from "date-fns";
import { Wallet, TrendingUp, TrendingDown, Calculator, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryCard } from "@/components/SummaryCard";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { ReconciliationPanel } from "@/components/ReconciliationPanel";
import { DailyReportDialog } from "@/components/DailyReportDialog";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useReconciliation } from "@/hooks/useReconciliation";
import { useState } from "react";

const DailyReconciliation = () => {
  const {
    reconciliation,
    transactions,
    loading,
    addTransaction,
    deleteTransaction,
    updateOpeningBalance,
    reconcile,
  } = useReconciliation();

  const [reportOpen, setReportOpen] = useState(false);

  const totalCashIn = reconciliation?.total_cash_in || 0;
  const totalCashOut = reconciliation?.total_cash_out || 0;
  const expectedBalance = reconciliation?.expected_balance || 0;
  const openingBalance = reconciliation?.opening_balance || 0;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(amount);
  };

  // Transform transactions for TransactionList component
  const transactionsForList = transactions.map((t) => ({
    id: t.id,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: t.amount,
    timestamp: t.timestamp,
  }));

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Daily Sales"
        description={format(new Date(), "EEEE, MMMM d, yyyy")}
        actions={
          <>
            <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
              <Wallet className="h-5 w-5 text-primary" />
              <span className="font-semibold text-primary">
                {transactions.length} transactions
              </span>
            </div>
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <FileText className="h-4 w-4 mr-2" />
              Report
            </Button>
          </>
        }
      />

      {/* Summary Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <SummaryCard
          title="Opening Balance"
          value={formatCurrency(openingBalance)}
          icon={Wallet}
          subtitle="Starting cash"
        />
        <SummaryCard
          title="Total Cash In"
          value={formatCurrency(totalCashIn)}
          icon={TrendingUp}
          variant="success"
          subtitle={`${transactions.filter((t) => t.type === "cash_in").length} transactions`}
        />
        <SummaryCard
          title="Total Cash Out"
          value={formatCurrency(totalCashOut)}
          icon={TrendingDown}
          variant="destructive"
          subtitle={`${transactions.filter((t) => t.type === "cash_out").length} transactions`}
        />
        <SummaryCard
          title="Expected Balance"
          value={formatCurrency(expectedBalance)}
          icon={Calculator}
          subtitle="Calculated total"
        />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Form & List */}
        <div className="space-y-6 lg:col-span-2">
          <TransactionForm onAddTransaction={addTransaction} />
          <TransactionList
            transactions={transactionsForList}
            onDeleteTransaction={deleteTransaction}
          />
        </div>

        {/* Right Column - Reconciliation */}
        <div>
          <ReconciliationPanel
            openingBalance={openingBalance}
            totalCashIn={totalCashIn}
            totalCashOut={totalCashOut}
            onOpeningBalanceChange={updateOpeningBalance}
            onReconcile={reconcile}
            status={reconciliation?.status}
            actualCash={reconciliation?.actual_cash}
            variance={reconciliation?.variance}
          />
        </div>
      </div>

      <DailyReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reconciliation={reconciliation}
      />
    </PageContainer>
  );
};

export default DailyReconciliation;
