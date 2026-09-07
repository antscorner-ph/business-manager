import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { ProductsManager } from "@/components/ProductsManager";
import { useProductsList } from "@/hooks/useProductsList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Products = () => {
  const { products, totalCount, query, setQuery, loading, refetch } = useProductsList();
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("loyverse-sync", {
        body: {},
      });

      if (error) {
        // supabase-js wraps non-2xx responses in a FunctionsHttpError whose
        // .message is generic; the real detail is in the Response at .context.
        let detail = error.message;
        const context = (error as { context?: Response }).context;
        if (context && typeof context.text === "function") {
          try {
            const body = await context.clone().text();
            const parsed = JSON.parse(body);
            if (parsed?.error) detail = parsed.error;
          } catch {
            /* keep generic message */
          }
          if (context.status === 404) {
            detail =
              "The loyverse-sync function isn't deployed yet. Deploy it with: supabase functions deploy loyverse-sync";
          }
        }
        throw new Error(detail);
      }

      if (data && data.ok === false) {
        throw new Error(data.error || "Sync failed");
      }

      toast({
        title: "Sync complete",
        description: `${data?.products_upserted ?? 0} products synced from Loyverse.`,
      });
      await refetch();
    } catch (error) {
      toast({
        title: "Sync failed",
        description:
          error instanceof Error ? error.message : "Could not sync from Loyverse.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  if (loading && products.length === 0) {
    return <PageLoader />;
  }

  return (
    <PageContainer>
      <PageHeader
        title="Products"
        description="Product catalog synced from Loyverse"
        actions={
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync from Loyverse"}
          </Button>
        }
      />

      <ProductsManager
        products={products}
        totalCount={totalCount}
        query={query}
        onQueryChange={setQuery}
      />
    </PageContainer>
  );
};

export default Products;
