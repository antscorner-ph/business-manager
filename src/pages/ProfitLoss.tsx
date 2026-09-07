import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { ProfitLossOverview } from "@/components/ProfitLossOverview";
import { useProfitAndLoss } from "@/hooks/useProfitAndLoss";

const ProfitLoss = () => {
  const { report, monthsToShow, setMonthsToShow, loading } = useProfitAndLoss();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Profit and Loss"
        description="Monthly revenue, expenses, and net result"
        actions={
          <Select
            value={String(monthsToShow)}
            onValueChange={(value: "6" | "12") => setMonthsToShow(Number(value) as 6 | 12)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last 12 months</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      {report ? <ProfitLossOverview report={report} /> : null}
    </PageContainer>
  );
};

export default ProfitLoss;
