import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight, Package, ImageOff, Eye, Loader2 } from "lucide-react";
import type { Product } from "@/hooks/useProducts";
import type { ProductsListQuery } from "@/hooks/useProductsList";
import { useDebouncedValue } from "@/lib/useDebouncedValue";

interface ProductsManagerProps {
  products: Product[];
  totalCount: number;
  query: ProductsListQuery;
  onQueryChange: (query: ProductsListQuery) => void;
  loading?: boolean;
}

const formatCurrency = (amount: number | null) =>
  amount == null
    ? "-"
    : new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

function InventoryBadge({ qty }: { qty: number | null }) {
  const value = qty ?? 0;
  const variant = qty === null ? "outline" : value <= 0 ? "destructive" : value <= 10 ? "secondary" : "outline";
  const label = qty === null ? "No data" : `${value}`;
  return <Badge variant={variant}>{label}</Badge>;
}

export function ProductsManager({
  products,
  totalCount,
  query,
  onQueryChange,
  loading = false,
}: ProductsManagerProps) {
  const [searchInput, setSearchInput] = useState(query.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  useEffect(() => {
    setSearchInput(query.search);
  }, [query.search]);

  useEffect(() => {
    if (debouncedSearch === query.search) return;
    onQueryChange({ ...query, search: debouncedSearch, page: 1 });
  }, [debouncedSearch, query, onQueryChange]);

  const totalPages = Math.ceil(totalCount / query.pageSize) || 1;

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Product Catalog
          </CardTitle>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or category..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <Select
              value={query.sortBy}
              onValueChange={(value: ProductsListQuery["sortBy"]) =>
                onQueryChange({ ...query, sortBy: value, page: 1 })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Sort by Name</SelectItem>
                <SelectItem value="qty">Sort by Stock (low first)</SelectItem>
                <SelectItem value="price">Sort by Price (high first)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[64px]">Image</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Searching products...
                    </div>
                  </TableCell>
                </TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No products found. Use "Sync from Loyverse" to import your catalog.
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.sku}>
                    <TableCell>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt={product.name || product.sku}
                          className="h-10 w-10 rounded object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted text-muted-foreground">
                          <ImageOff className="h-4 w-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{product.name || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                    <TableCell>{product.category || "-"}</TableCell>
                    <TableCell className="text-right">{formatCurrency(product.price)}</TableCell>
                    <TableCell className="text-right">
                      <InventoryBadge qty={product.qty} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/products/${encodeURIComponent(product.sku)}`}>
                          <Eye className="mr-1 h-4 w-4" />
                          View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalCount > query.pageSize && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-muted-foreground">
              Showing {(query.page - 1) * query.pageSize + 1} to{" "}
              {Math.min(query.page * query.pageSize, totalCount)} of {totalCount} products
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onQueryChange({ ...query, page: Math.max(query.page - 1, 1) })}
                disabled={query.page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="text-sm">
                Page {query.page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onQueryChange({ ...query, page: Math.min(query.page + 1, totalPages) })
                }
                disabled={query.page >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
