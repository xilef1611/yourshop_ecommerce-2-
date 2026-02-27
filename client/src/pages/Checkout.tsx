import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Loader2, Lock, Package, Truck, Ticket, X, Check } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

export default function Checkout() {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    street: "",
    city: "",
    postal: "",
    country: "",
  });

  const [selectedShipping, setSelectedShipping] = useState<number | null>(null);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    discountType: string | null;
    discountValue: number | null;
  } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);

  // Fetch shipping options
  const { data: shippingOptions, isLoading: shippingLoading } = trpc.shipping.list.useQuery();

  // Auto-select first shipping option
  useEffect(() => {
    if (shippingOptions && shippingOptions.length > 0 && selectedShipping === null) {
      setSelectedShipping(shippingOptions[0].id);
    }
  }, [shippingOptions, selectedShipping]);

  // Pre-fill from user profile
  useEffect(() => {
    if (user) {
      const nameParts = (user.name || "").split(" ");
      setForm(prev => ({
        ...prev,
        firstName: prev.firstName || nameParts[0] || "",
        lastName: prev.lastName || nameParts.slice(1).join(" ") || "",
        email: prev.email || user.email || "",
        phone: prev.phone || (user as any).phone || "",
        street: prev.street || (user as any).addressStreet || "",
        city: prev.city || (user as any).addressCity || "",
        postal: prev.postal || (user as any).addressPostal || "",
        country: prev.country || (user as any).addressCountry || "",
      }));
    }
  }, [user]);

  const createOrder = trpc.orders.create.useMutation();
  const initiatePayment = trpc.payment.initiate.useMutation();
  const [isProcessing, setIsProcessing] = useState(false);

  // Calculate shipping cost
  const selectedShippingOption = useMemo(() => {
    if (!shippingOptions || selectedShipping === null) return null;
    return shippingOptions.find((o: any) => o.id === selectedShipping) || null;
  }, [shippingOptions, selectedShipping]);

  const shippingCost = selectedShippingOption ? parseFloat(String(selectedShippingOption.price)) : 0;
  const couponDiscount = appliedCoupon?.discountAmount || 0;
  const grandTotal = Math.max(0, totalPrice + shippingCost - couponDiscount);

  // Coupon validation via tRPC
  const validateCouponQuery = trpc.coupons.validate.useQuery(
    { code: couponInput.trim(), orderTotal: totalPrice },
    { enabled: false }
  );

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponError("Please enter a coupon code");
      return;
    }
    setCouponLoading(true);
    setCouponError(null);
    try {
      const result = await validateCouponQuery.refetch();
      const data = result.data;
      if (data?.valid) {
        setAppliedCoupon({
          code,
          discountAmount: data.discountAmount,
          discountType: data.discountType,
          discountValue: data.discountValue,
        });
        setCouponError(null);
        toast.success(`Coupon "${code}" applied! You save $${data.discountAmount.toFixed(2)}`);
      } else {
        setCouponError(data?.error || "Invalid coupon code");
        setAppliedCoupon(null);
      }
    } catch (e: any) {
      setCouponError("Failed to validate coupon");
      setAppliedCoupon(null);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  if (items.length === 0) {
    return (
      <div className="container py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold mb-3">Your cart is empty</h1>
        <Link href="/">
          <Button>Back to Shop</Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.street || !form.city || !form.postal || !form.country) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsProcessing(true);
    try {
      const orderResult = await createOrder.mutateAsync({
        customerName: `${form.firstName} ${form.lastName}`,
        customerEmail: form.email,
        customerPhone: form.phone || undefined,
        addressStreet: form.street,
        addressCity: form.city,
        addressPostal: form.postal,
        addressCountry: form.country,
        currency: "USD",
        shippingOptionId: selectedShipping || undefined,
        shippingCost: shippingCost.toFixed(2),
        couponCode: appliedCoupon?.code || undefined,
        items: items.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          productName: item.name,
          unitLabel: item.unitLabel,
          quantity: item.quantity,
          unitPrice: item.price.toFixed(2),
          lineTotal: (item.price * item.quantity).toFixed(2),
        })),
      });

      // Initiate payment
      const paymentResult = await initiatePayment.mutateAsync({
        orderNumber: orderResult.orderNumber,
        origin: window.location.origin,
      });

      clearCart();

      if (paymentResult.payUrl) {
        window.location.href = paymentResult.payUrl;
      } else if (paymentResult.demo) {
        toast.success("Order created! (Demo mode - no payment gateway configured)");
        navigate(`/payment-success?order=${orderResult.orderNumber}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create order");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container py-8 max-w-5xl mx-auto">
      <Link href="/cart">
        <Button variant="ghost" className="mb-6 gap-2 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to Cart
        </Button>
      </Link>

      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Contact */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input id="firstName" value={form.firstName} onChange={e => updateField("firstName", e.target.value)} className="bg-background" required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input id="lastName" value={form.lastName} onChange={e => updateField("lastName", e.target.value)} className="bg-background" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" type="email" value={form.email} onChange={e => updateField("email", e.target.value)} className="bg-background" required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone (optional)</Label>
                  <Input id="phone" value={form.phone} onChange={e => updateField("phone", e.target.value)} className="bg-background" />
                </div>
              </CardContent>
            </Card>

            {/* Address */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg">Shipping Address</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="street">Street Address *</Label>
                  <Input id="street" value={form.street} onChange={e => updateField("street", e.target.value)} className="bg-background" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="city">City *</Label>
                    <Input id="city" value={form.city} onChange={e => updateField("city", e.target.value)} className="bg-background" required />
                  </div>
                  <div>
                    <Label htmlFor="postal">Postal Code *</Label>
                    <Input id="postal" value={form.postal} onChange={e => updateField("postal", e.target.value)} className="bg-background" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input id="country" value={form.country} onChange={e => updateField("country", e.target.value)} className="bg-background" required />
                </div>
              </CardContent>
            </Card>

            {/* Shipping Method */}
            {shippingOptions && shippingOptions.length > 0 && (
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Shipping Method
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {shippingLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                  ) : (
                    <RadioGroup
                      value={selectedShipping?.toString() || ""}
                      onValueChange={v => setSelectedShipping(parseInt(v))}
                      className="space-y-3"
                    >
                      {shippingOptions.map((opt: any) => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedShipping === opt.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <RadioGroupItem value={opt.id.toString()} />
                          <div className="flex-1">
                            <p className="font-semibold">{opt.name}</p>
                            {opt.description && <p className="text-sm text-muted-foreground">{opt.description}</p>}
                            {opt.estimatedDays && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Estimated delivery: {opt.estimatedDays} days
                              </p>
                            )}
                          </div>
                          <div className="font-semibold text-right">
                            {parseFloat(opt.price) === 0 ? (
                              <span className="text-green-400">Free</span>
                            ) : (
                              <span>${parseFloat(opt.price).toFixed(2)}</span>
                            )}
                          </div>
                        </label>
                      ))}
                    </RadioGroup>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Coupon Code */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-primary" />
                  Discount Code
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                    <div className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <code className="font-mono font-bold text-primary">{appliedCoupon.code}</code>
                          <Badge className="bg-green-500/20 text-green-400 text-xs">Applied</Badge>
                        </div>
                        <p className="text-sm text-green-400 mt-0.5">
                          {appliedCoupon.discountType === "percentage"
                            ? `${appliedCoupon.discountValue}% off`
                            : `$${appliedCoupon.discountValue?.toFixed(2)} off`}
                          {" — "}You save ${appliedCoupon.discountAmount.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={couponInput}
                        onChange={e => {
                          setCouponInput(e.target.value.toUpperCase());
                          setCouponError(null);
                        }}
                        placeholder="Enter coupon code"
                        className="bg-background font-mono"
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleApplyCoupon(); } }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-transparent shrink-0 gap-2"
                        onClick={handleApplyCoupon}
                        disabled={couponLoading}
                      >
                        {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                      </Button>
                    </div>
                    {couponError && (
                      <p className="text-sm text-destructive">{couponError}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary */}
          <div>
            <Card className="bg-card border-border sticky top-24">
              <CardHeader>
                <CardTitle className="text-lg">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {items.map(item => (
                    <div key={`${item.productId}-${item.variantId}`} className="flex justify-between text-sm">
                      <div>
                        <span className="text-foreground">{item.name}</span>
                        {item.unitLabel && <span className="text-muted-foreground"> ({item.unitLabel})</span>}
                        <span className="text-muted-foreground"> × {item.quantity}</span>
                      </div>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>${totalPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    {shippingCost === 0 ? (
                      <span className="text-green-400">Free</span>
                    ) : (
                      <span>${shippingCost.toFixed(2)}</span>
                    )}
                  </div>
                  {selectedShippingOption && (
                    <div className="text-xs text-muted-foreground">
                      {selectedShippingOption.name}
                      {selectedShippingOption.estimatedDays && ` (${selectedShippingOption.estimatedDays} days)`}
                    </div>
                  )}
                  {appliedCoupon && (
                    <div className="flex justify-between text-green-400">
                      <span className="flex items-center gap-1">
                        <Ticket className="h-3.5 w-3.5" /> Discount ({appliedCoupon.code})
                      </span>
                      <span>-${couponDiscount.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">${grandTotal.toFixed(2)}</span>
                </div>
                <Button type="submit" className="w-full gap-2" size="lg" disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4" /> Pay ${grandTotal.toFixed(2)}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Secure payment via cryptocurrency (Oxapay)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
}
