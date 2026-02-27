import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ShoppingCart, Plus, Minus, Package, Filter, X } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [priceRange, setPriceRange] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data: products, isLoading } = trpc.products.search.useQuery({
    query: searchQuery,
    category: selectedCategory || undefined,
    minPrice: priceRange === "0-25" ? 0 : priceRange === "25-50" ? 25 : priceRange === "50-100" ? 50 : priceRange === "100+" ? 100 : undefined,
    maxPrice: priceRange === "0-25" ? 25 : priceRange === "25-50" ? 50 : priceRange === "50-100" ? 100 : undefined,
    onlyAvailable,
  });

  const { data: categories } = trpc.products.categories.useQuery();
  const { addItem } = useCart();

  const handleAddToCart = (product: any, variant: any) => {
    addItem({
      productId: product.id,
      variantId: variant.id,
      name: product.name,
      unitLabel: variant.unitLabel,
      price: parseFloat(variant.price),
      quantity: 1,
      imageUrl: product.imageUrl || undefined,
    });
    toast.success(`${product.name} (${variant.unitLabel}) added to cart`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setPriceRange("");
    setOnlyAvailable(false);
  };

  const hasActiveFilters = searchQuery || selectedCategory || priceRange || onlyAvailable;

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
        <div className="relative container py-12 md:py-20">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
            Welcome to YourShop
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mb-8">
            Browse our collection and pay securely with cryptocurrency. Fast, private, and decentralized.
          </p>

          {/* Search Bar */}
          <div className="flex gap-2 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10 bg-card border-border"
              />
            </div>
            <Button variant="outline" className="bg-transparent" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {hasActiveFilters && <Badge variant="default" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">!</Badge>}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border-b border-border bg-card/50">
          <div className="container py-4 flex flex-wrap gap-4 items-center">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priceRange} onValueChange={setPriceRange}>
              <SelectTrigger className="w-[160px] bg-background">
                <SelectValue placeholder="Price Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Price</SelectItem>
                <SelectItem value="0-25">$0 - $25</SelectItem>
                <SelectItem value="25-50">$25 - $50</SelectItem>
                <SelectItem value="50-100">$50 - $100</SelectItem>
                <SelectItem value="100+">$100+</SelectItem>
              </SelectContent>
            </Select>

            <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={e => setOnlyAvailable(e.target.checked)}
                className="rounded border-border"
              />
              In Stock Only
            </label>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Products Grid */}
      <div className="container py-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="bg-card border-border animate-pulse">
                <div className="aspect-square bg-muted rounded-t-lg" />
                <CardContent className="p-4 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-8 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products && products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product: any) => (
              <ProductCard key={product.id} product={product} onAddToCart={handleAddToCart} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">No products found</h2>
            <p className="text-muted-foreground">
              {hasActiveFilters ? "Try adjusting your filters." : "Products will appear here once they are added."}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4 bg-transparent" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCard({ product, onAddToCart }: { product: any; onAddToCart: (product: any, variant: any) => void }) {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const variants = product.variants || [];
  const variant = variants[selectedVariant];

  if (!variant) return null;

  const minPrice = Math.min(...variants.map((v: any) => parseFloat(v.price)));
  const maxPrice = Math.max(...variants.map((v: any) => parseFloat(v.price)));
  const priceDisplay = minPrice === maxPrice ? `$${minPrice.toFixed(2)}` : `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;

  return (
    <Card className="bg-card border-border overflow-hidden group hover:border-primary/50 transition-all duration-300">
      {/* Image */}
      <div className="aspect-square bg-muted relative overflow-hidden">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-16 w-16 text-muted-foreground/30" />
          </div>
        )}
        {product.category && (
          <Badge variant="secondary" className="absolute top-3 left-3 text-xs">
            {product.category}
          </Badge>
        )}
      </div>

      <CardContent className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
          {product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
          )}
        </div>

        <div className="text-lg font-bold text-primary">{priceDisplay}</div>

        {/* Variant selector */}
        {variants.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {variants.map((v: any, i: number) => (
              <button
                key={v.id}
                onClick={() => setSelectedVariant(i)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  i === selectedVariant
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {v.unitLabel}
              </button>
            ))}
          </div>
        )}

        {/* Selected variant info + Add to cart */}
        <div className="flex items-center justify-between pt-1">
          <div className="text-sm">
            <span className="font-semibold text-foreground">${parseFloat(variant.price).toFixed(2)}</span>
            {variant.unitLabel && <span className="text-muted-foreground ml-1">/ {variant.unitLabel}</span>}
          </div>
          <Button
            size="sm"
            onClick={() => onAddToCart(product, variant)}
            className="gap-1"
            disabled={variant.stock <= 0}
          >
            {variant.stock <= 0 ? (
              "Out of Stock"
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" />
                Add
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
