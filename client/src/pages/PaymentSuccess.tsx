import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Package, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function PaymentSuccess() {
  const params = new URLSearchParams(window.location.search);
  const orderNumber = params.get("order");

  return (
    <div className="container py-20 max-w-lg mx-auto text-center">
      <Card className="bg-card border-border">
        <CardContent className="p-8 space-y-6">
          <CheckCircle className="h-20 w-20 mx-auto text-green-400" />
          <h1 className="text-2xl font-bold">Order Placed Successfully!</h1>
          <p className="text-muted-foreground">
            Thank you for your order. We will process it as soon as payment is confirmed.
          </p>
          {orderNumber && (
            <div className="bg-muted rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Order Number</p>
              <p className="text-lg font-bold text-primary">{orderNumber}</p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            You will receive a confirmation once your payment has been verified.
            Please keep your order number for reference.
          </p>
          <div className="flex flex-col gap-3">
            <Link href="/">
              <Button className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" /> Continue Shopping
              </Button>
            </Link>
            <Link href="/orders">
              <Button variant="outline" className="w-full gap-2 bg-transparent">
                <Package className="h-4 w-4" /> View My Orders
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
