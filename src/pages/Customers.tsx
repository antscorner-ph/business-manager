import { CustomersManager } from "@/components/CustomersManager";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useCustomers } from "@/hooks/useCustomers";

const Customers = () => {
  const {
    customers,
    totalCount,
    query,
    setQuery,
    loading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomers();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        description="Manage customer information and contact details"
      />

      <CustomersManager
        customers={customers}
        totalCount={totalCount}
        query={query}
        onQueryChange={setQuery}
        onAddCustomer={addCustomer}
        onUpdateCustomer={updateCustomer}
        onDeleteCustomer={deleteCustomer}
      />
    </PageContainer>
  );
};

export default Customers;
