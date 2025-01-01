import { format } from "date-fns";
import { Link } from "react-router-dom";
import { Wallet, TrendingUp, TrendingDown, Calculator, History, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryCard } from "@/components/SummaryCard";
import { TransactionForm } from "@/components/TransactionForm";
import { TransactionList } from "@/components/TransactionList";
import { ReconciliationPanel } from "@/components/ReconciliationPanel";
import { DailyReportDialog } from "@/components/DailyReportDialog";
import { useReconciliation } from "@/hooks/useReconciliation";
import { useState } from "react";

const Index = () => {
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Cash Management System
              </h1>
              <p className="text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d, yyyy")}
              </p>
            </div>
            <div className="flex items-center gap-3">
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
              <Link to="/receivables">
                <Button variant="outline">
                  <Building2 className="h-4 w-4 mr-2" />
                  Financial
                </Button>
              </Link>
              <Link to="/history">
                <Button variant="outline">
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
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
      </main>

      <DailyReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        reconciliation={reconciliation}
      />
    </div>
  );
};

export default Index;
