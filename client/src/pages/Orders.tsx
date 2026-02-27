import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Loader2, ArrowLeft, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { getLoginUrl } from "@/const";

const statusColors: Record<string, string> = {
  new: "bg-blue-500/20 text-blue-400",
  paid_not_shipped: "bg-yellow-500/20 text-yellow-400",
  shipped: "bg-purple-500/20 text-purple-400",
  delivered: "bg-green-500/20 text-green-400",
  cancelled: "bg-red-500/20 text-red-400",
  pending: "bg-gray-500/20 text-gray-400",
  paid: "bg-green-500/20 text-green-400",
  failed: "bg-red-500/20 text-red-400",
  expired: "bg-orange-500/20 text-orange-400",
};

export default function Orders() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: orders, isLoading } = trpc.orders.myOrders.useQuery(undefined, { enabled: isAuthenticated });

  if (authLoading) {
    return (
      <div className="container py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center">
        <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold mb-3">Login Required</h1>
        <p className="text-muted-foreground mb-6">Please login to view your orders.</p>
        <a href={getLoginUrl()}>
          <Button>Login</Button>
        </a>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <Package className="h-6 w-6 text-primary" />
        My Orders
      </h1>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
        </div>
      ) : orders && orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order: any) => (
            <Card key={order.id} className="bg-card border-border">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-foreground">{order.orderNumber}</span>
                      <Badge className={statusColors[order.orderStatus] || "bg-gray-500/20 text-gray-400"}>
                        {order.orderStatus.replace(/_/g, " ")}
                      </Badge>
                      <Badge className={statusColors[order.paymentStatus] || "bg-gray-500/20 text-gray-400"}>
                        {order.paymentStatus}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("de-DE", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-bold text-primary">
                      ${parseFloat(order.totalAmount).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Items */}
                {order.items && order.items.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="space-y-2">
                      {order.items.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-muted-foreground">
                            {item.productName}
                            {item.unitLabel && ` (${item.unitLabel})`}
                            {" × "}{item.quantity}
                          </span>
                          <span>${parseFloat(item.lineTotal).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pay button if pending */}
                {order.paymentStatus === "pending" && order.oxapayPayUrl && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <a href={order.oxapayPayUrl} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" className="gap-2">
                        <ExternalLink className="h-3.5 w-3.5" /> Complete Payment
                      </Button>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
          <p className="text-muted-foreground mb-4">Start shopping to see your orders here.</p>
          <Link href="/">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Browse Products
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
