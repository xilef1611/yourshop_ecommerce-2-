import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, CreditCard, Package } from "lucide-react";
import { Link } from "wouter";

export default function Cart() {
  const { items, removeItem, updateQuantity, totalPrice, totalItems, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <ShoppingCart className="h-20 w-20 mx-auto text-muted-foreground/30 mb-6" />
        <h1 className="text-2xl font-bold mb-3">Your cart is empty</h1>
        <p className="text-muted-foreground mb-6">Add some products to get started.</p>
        <Link href="/">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Continue Shopping
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="h-6 w-6 text-primary" />
          Shopping Cart ({totalItems} items)
        </h1>
        <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4 mr-1" /> Clear Cart
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map(item => (
            <Card key={`${item.productId}-${item.variantId}`} className="bg-card border-border">
              <CardContent className="p-4 flex gap-4">
                <div className="w-20 h-20 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{item.name}</h3>
                      {item.unitLabel && (
                        <p className="text-sm text-muted-foreground">{item.unitLabel}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(item.productId, item.variantId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2 border border-border rounded-lg">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity - 1)}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => updateQuantity(item.productId, item.variantId, item.quantity + 1)}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <span className="font-semibold text-primary">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div>
          <Card className="bg-card border-border sticky top-24">
            <CardHeader>
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${totalPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-green-400">Free</span>
                </div>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">${totalPrice.toFixed(2)}</span>
              </div>
              <Link href="/checkout">
                <Button className="w-full gap-2 mt-2" size="lg">
                  <CreditCard className="h-4 w-4" /> Proceed to Checkout
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full bg-transparent gap-2">
                  <ArrowLeft className="h-4 w-4" /> Continue Shopping
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
