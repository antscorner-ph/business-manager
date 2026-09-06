import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useProducts, type Product } from "@/hooks/useProducts";

interface POProductSearchProps {
  onAdd: (product: Product) => void;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }).format(amount);

/** Renders a colored badge for a product's remaining inventory. */
function InventoryBadge({ qty }: { qty: number | null }) {
  const value = qty ?? 0;
  const variant = value <= 0 ? "destructive" : value <= 10 ? "secondary" : "outline";
  const label = qty === null ? "No stock data" : `${value} on hand`;
  return <Badge variant={variant}>{label}</Badge>;
}

export function POProductSearch({ onAdd }: POProductSearchProps) {
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");

  // Debounce the search input to avoid a query on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input), 300);
    return () => clearTimeout(timer);
  }, [input]);

  const { products, loading } = useProducts(debounced);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products by name, SKU, or category..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="pl-9"
        />
      </div>
      <p className="text-xs text-muted-foreground">Click a product to add it to the order.</p>

      <div className="rounded-md border">
        <ScrollArea className="h-[320px]">
          {loading ? (            <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Searching...</span>
            </div>
          ) : products.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              {debounced ? "No products found" : "Start typing to search the catalog"}
            </div>
          ) : (
            <ul className="divide-y">
              {products.map((product) => (
                <li
                  key={product.sku}
                  role="button"
                  tabIndex={0}
                  onClick={() => onAdd(product)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onAdd(product);
                    }
                  }}
                  className="cursor-pointer px-4 py-3 hover:bg-muted/50 active:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{product.name || product.sku}</p>
                    <InventoryBadge qty={product.qty} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono">{product.sku}</span>
                    {product.category && <span>· {product.category}</span>}
                    <span>· {formatCurrency(product.price ?? 0)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
