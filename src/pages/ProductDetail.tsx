import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ImageOff, Package, Tag, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/PageContainer";
import { PageHeader } from "@/components/PageHeader";
import { PageLoader } from "@/components/PageLoader";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/hooks/useProducts";
import { useToast } from "@/hooks/use-toast";

function formatCurrency(amount: number | null) {
  if (amount == null) return "-";
  return new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);
}

function inventoryStatus(product: Product) {
  const qty = product.qty ?? 0;
  const threshold = product.low_stock ?? 0;

  if (qty <= 0) return { label: "Out of stock", variant: "destructive" as const };
  if (qty <= threshold) return { label: "Low stock", variant: "secondary" as const };
  return { label: "In stock", variant: "outline" as const };
}

const ProductDetail = () => {
  const { sku: rawSku } = useParams<{ sku: string }>();
  const sku = decodeURIComponent(rawSku || "");
  const { toast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      if (!sku) {
        setProduct(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("sku, name, category, desc, price, qty, image, low_stock")
        .eq("sku", sku)
        .maybeSingle();

      if (!active) return;

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }

      setProduct(data || null);
      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, [sku, toast]);

  if (loading) {
    return <PageLoader />;
  }

  if (!product) {
    return (
      <PageContainer>
        <PageHeader
          title="Product not found"
          description="This SKU does not exist in the synced catalog"
          actions={
            <Button asChild variant="outline">
              <Link to="/products">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Products
              </Link>
            </Button>
          }
        />
      </PageContainer>
    );
  }

  const stock = inventoryStatus(product);

  return (
    <PageContainer>
      <PageHeader
        title={product.name || product.sku}
        description={`SKU: ${product.sku}`}
        actions={
          <Button asChild variant="outline">
            <Link to="/products">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name || product.sku}
                className="h-64 w-full rounded-md object-cover"
              />
            ) : (
              <div className="flex h-64 w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
                <div className="text-center">
                  <ImageOff className="mx-auto h-8 w-8" />
                  <p className="mt-2 text-sm">No product image</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Product Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium">{product.name || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">SKU</p>
              <p className="font-mono text-sm">{product.sku}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Category</p>
              <p>{product.category || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Price</p>
              <p>{formatCurrency(product.price)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Stock</p>
              <p>{product.qty ?? "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Low Stock Threshold</p>
              <p>{product.low_stock ?? "-"}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Description</p>
              <p>{product.desc || "-"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Stock Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={stock.variant}>{stock.label}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Catalog Group</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span>{product.category || "Uncategorized"}</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Inventory Snapshot</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-muted-foreground" />
            <span>{product.qty ?? 0} units on hand</span>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="h-4 w-4" />
              Product data is read-only and synced from Loyverse.
            </div>
            <Button asChild>
              <Link to="/purchase-orders/new">Create Purchase Order</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
};

export default ProductDetail;
