import { SuppliersManager } from "@/components/SuppliersManager";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { useSuppliers } from "@/hooks/useSuppliers";

const Suppliers = () => {
  const {
    suppliers,
    totalCount,
    query,
    setQuery,
    loading,
    addSupplier,
    updateSupplier,
    deleteSupplier,
  } = useSuppliers();

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Suppliers"
        description="Manage supplier information and payment terms"
      />

      <SuppliersManager
        suppliers={suppliers}
        totalCount={totalCount}
        query={query}
        onQueryChange={setQuery}
        onAddSupplier={addSupplier}
        onUpdateSupplier={updateSupplier}
        onDeleteSupplier={deleteSupplier}
      />
    </PageContainer>
  );
};

export default Suppliers;
