import { CustomersManager } from "@/components/CustomersManager";
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
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">
            Manage customer information and contact details
          </p>
        </div>

        <CustomersManager
          customers={customers}
          totalCount={totalCount}
          query={query}
          onQueryChange={setQuery}
          onAddCustomer={addCustomer}
          onUpdateCustomer={updateCustomer}
          onDeleteCustomer={deleteCustomer}
        />
      </main>
    </div>
  );
};

export default Customers;
