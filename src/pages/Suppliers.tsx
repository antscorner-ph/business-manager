import { SuppliersManager } from "@/components/SuppliersManager";
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
          <h1 className="text-3xl font-bold tracking-tight">Suppliers</h1>
          <p className="text-muted-foreground">
            Manage supplier information and payment terms
          </p>
        </div>

        <SuppliersManager
          suppliers={suppliers}
          totalCount={totalCount}
          query={query}
          onQueryChange={setQuery}
          onAddSupplier={addSupplier}
          onUpdateSupplier={updateSupplier}
          onDeleteSupplier={deleteSupplier}
        />
      </main>
    </div>
  );
};

export default Suppliers;
