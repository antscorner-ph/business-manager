import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { BalanceSheetOverview } from "@/components/BalanceSheetOverview";
import { useBalanceSheet } from "@/hooks/useBalanceSheet";

const BalanceSheet = () => {
  const { report, monthsToShow, setMonthsToShow, loading } = useBalanceSheet();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Balance Sheet"
        description="Month-end assets, liabilities, and equity"
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

      {report ? <BalanceSheetOverview report={report} /> : null}
    </PageContainer>
  );
};

export default BalanceSheet;
