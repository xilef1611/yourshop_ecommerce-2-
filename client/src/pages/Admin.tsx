import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Shield, Package, ShoppingCart, Truck, MessageSquare, Settings, Plus, Trash2,
  Loader2, Eye, Edit, FileText, Download, X, Save, Upload, BarChart3
} from "lucide-react";
import AdminAnalytics from "./AdminAnalytics";
import AdminMarketing from "./AdminMarketing";
import AdminShipping from "./AdminShipping";
import AdminCoupons from "./AdminCoupons";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { Mail, Truck as TruckIcon, Ticket } from "lucide-react";

export default function Admin() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return <div className="container py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="container py-20 text-center">
        <Shield className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold mb-3">Access Denied</h1>
        <p className="text-muted-foreground mb-6">You need admin privileges to access this page.</p>
        {!isAuthenticated && <a href={getLoginUrl()}><Button>Login</Button></a>}
      </div>
    );
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        Admin Dashboard
      </h1>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList className="bg-card border border-border">
          <TabsTrigger value="orders" className="gap-1.5"><ShoppingCart className="h-4 w-4" /> Orders</TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5"><Package className="h-4 w-4" /> Products</TabsTrigger>
          <TabsTrigger value="packlist" className="gap-1.5"><Truck className="h-4 w-4" /> Packlist</TabsTrigger>
          <TabsTrigger value="tickets" className="gap-1.5"><MessageSquare className="h-4 w-4" /> Tickets</TabsTrigger>
          <TabsTrigger value="analytics" className="gap-1.5"><BarChart3 className="h-4 w-4" /> Analytics</TabsTrigger>
          <TabsTrigger value="coupons" className="gap-1.5"><Ticket className="h-4 w-4" /> Coupons</TabsTrigger>
          <TabsTrigger value="marketing" className="gap-1.5"><Mail className="h-4 w-4" /> Marketing</TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5"><Settings className="h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics"><AdminAnalytics /></TabsContent>
        <TabsContent value="orders"><AdminOrders /></TabsContent>
        <TabsContent value="products"><AdminProducts /></TabsContent>
        <TabsContent value="packlist"><AdminPacklist /></TabsContent>
        <TabsContent value="tickets"><AdminTickets /></TabsContent>
        <TabsContent value="coupons"><AdminCoupons /></TabsContent>
        <TabsContent value="marketing"><AdminMarketing /></TabsContent>
        <TabsContent value="settings"><AdminSettings /></TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== ORDERS TAB ====================
function AdminOrders() {
  const { data: orders, isLoading } = trpc.orders.listAll.useQuery();
  const utils = trpc.useUtils();
  const updateStatus = trpc.orders.updateStatus.useMutation();
  const [viewOrder, setViewOrder] = useState<number | null>(null);

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;

  return (
    <div>
      {viewOrder ? (
        <OrderDetail orderId={viewOrder} onBack={() => setViewOrder(null)} />
      ) : (
        <Card className="bg-card border-border">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders && orders.length > 0 ? orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-bold">{order.orderNumber}</TableCell>
                    <TableCell>
                      <div>{order.customerName}</div>
                      <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                    </TableCell>
                    <TableCell className="font-semibold">${parseFloat(order.totalAmount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge className={order.paymentStatus === "paid" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}>
                        {order.paymentStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="bg-primary/20 text-primary">{order.orderStatus.replace(/_/g, " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(order.createdAt).toLocaleDateString("de-DE")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setViewOrder(order.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {order.paymentStatus === "paid" && (
                          <a href={`/api/admin/packlist/${order.id}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="bg-transparent">
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders yet</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function OrderDetail({ orderId, onBack }: { orderId: number; onBack: () => void }) {
  const { data: order, isLoading } = trpc.orders.getById.useQuery({ id: orderId });
  const utils = trpc.useUtils();
  const updateStatus = trpc.orders.updateStatus.useMutation();

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  if (!order) return <p>Order not found</p>;

  const handleStatusUpdate = async (field: string, value: string) => {
    try {
      await updateStatus.mutateAsync({ id: orderId, [field]: value });
      toast.success("Status updated");
      utils.orders.getById.invalidate({ id: orderId });
      utils.orders.listAll.invalidate();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <Button variant="ghost" className="mb-4 text-muted-foreground" onClick={onBack}>← Back to Orders</Button>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-card border-border">
          <CardHeader><CardTitle>Order Info</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Order #:</strong> {order.orderNumber}</p>
            <p><strong>Total:</strong> ${parseFloat(order.totalAmount).toFixed(2)} {order.currency}</p>
            <div className="flex items-center gap-2">
              <strong>Payment:</strong>
              <Select defaultValue={order.paymentStatus} onValueChange={v => handleStatusUpdate("paymentStatus", v)}>
                <SelectTrigger className="w-40 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <strong>Status:</strong>
              <Select defaultValue={order.orderStatus} onValueChange={v => handleStatusUpdate("orderStatus", v)}>
                <SelectTrigger className="w-48 bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="paid_not_shipped">Paid (Not Shipped)</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {order.oxapayTrackId && <p><strong>Oxapay Track ID:</strong> {order.oxapayTrackId}</p>}
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader><CardTitle>Customer & Address</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>Name:</strong> {order.customerName}</p>
            <p><strong>Email:</strong> {order.customerEmail}</p>
            {order.customerPhone && <p><strong>Phone:</strong> {order.customerPhone}</p>}
            <div className="pt-2 border-t border-border mt-2">
              <p>{order.addressStreet}</p>
              <p>{order.addressPostal} {order.addressCity}</p>
              <p>{order.addressCountry}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card className="bg-card border-border mt-6">
        <CardHeader><CardTitle>Order Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Variant</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{item.productName}</TableCell>
                  <TableCell>{item.unitLabel || "-"}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">${parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-semibold">${parseFloat(item.lineTotal).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== PRODUCTS TAB ====================
function AdminProducts() {
  const { data: products, isLoading } = trpc.products.listAll.useQuery();
  const utils = trpc.useUtils();
  const deleteProduct = trpc.products.delete.useMutation();
  const [editProduct, setEditProduct] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteProduct.mutateAsync({ id });
      toast.success("Product deleted");
      utils.products.listAll.invalidate();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Products ({products?.length || 0})</h2>
        <Dialog open={showCreate || !!editProduct} onOpenChange={v => { if (!v) { setShowCreate(false); setEditProduct(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2" onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" /> Add Product</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            </DialogHeader>
            <ProductForm
              product={editProduct}
              onSuccess={() => { setShowCreate(false); setEditProduct(null); utils.products.listAll.invalidate(); }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Variants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products && products.length > 0 ? products.map((product: any) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground/30" /></div>
                      )}
                      <span className="font-semibold">{product.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{product.category || "-"}</TableCell>
                  <TableCell>{product.variants?.length || 0}</TableCell>
                  <TableCell>
                    <Badge className={product.active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}>
                      {product.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setEditProduct(product)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="bg-transparent text-destructive hover:text-destructive" onClick={() => handleDelete(product.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No products yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ProductForm({ product, onSuccess }: { product?: any; onSuccess: () => void }) {
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [category, setCategory] = useState(product?.category || "");
  const [imageUrl, setImageUrl] = useState(product?.imageUrl || "");
  const [variants, setVariants] = useState<any[]>(
    product?.variants?.map((v: any) => ({ ...v, price: v.price.toString() })) || [{ unitLabel: "", unitValue: "", price: "", stock: 0 }]
  );

  const createProduct = trpc.products.create.useMutation();
  const updateProduct = trpc.products.update.useMutation();
  const createVariant = trpc.variants.create.useMutation();
  const updateVariant = trpc.variants.update.useMutation();
  const deleteVariant = trpc.variants.delete.useMutation();
  const uploadImage = trpc.products.uploadImage.useMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const result = await uploadImage.mutateAsync({
          fileName: file.name,
          base64Data: base64,
          contentType: file.type,
        });
        setImageUrl(result.url);
        toast.success("Image uploaded");
      };
      reader.readAsDataURL(file);
    } catch (e: any) { toast.error("Upload failed: " + e.message); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let productId = product?.id;

      if (productId) {
        await updateProduct.mutateAsync({ id: productId, name, description, category, imageUrl, active: 1 });
      } else {
        const result = await createProduct.mutateAsync({ name, description, category, imageUrl });
        productId = result.id;
      }

      // Handle variants
      const existingIds = new Set(product?.variants?.map((v: any) => v.id) || []);
      for (const v of variants) {
        if (v.id && existingIds.has(v.id)) {
          await updateVariant.mutateAsync({ id: v.id, unitLabel: v.unitLabel, unitValue: v.unitValue || undefined, price: v.price, stock: parseInt(v.stock) || 0 });
          existingIds.delete(v.id);
        } else if (v.unitLabel && v.price) {
          await createVariant.mutateAsync({ productId: productId!, unitLabel: v.unitLabel, unitValue: v.unitValue || undefined, price: v.price, stock: parseInt(v.stock) || 0 });
        }
      }
      // Delete removed variants
      for (const id of Array.from(existingIds)) {
        await deleteVariant.mutateAsync({ id: id as number });
      }

      toast.success(product ? "Product updated" : "Product created");
      onSuccess();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Product Name *</Label>
        <Input value={name} onChange={e => setName(e.target.value)} className="bg-background" required />
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={e => setDescription(e.target.value)} className="bg-background" />
      </div>
      <div>
        <Label>Category</Label>
        <Input value={category} onChange={e => setCategory(e.target.value)} className="bg-background" placeholder="e.g., Electronics" />
      </div>
      <div>
        <Label>Product Image</Label>
        <div className="flex gap-2 items-center">
          <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="bg-background flex-1" placeholder="Image URL" />
          <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
          <Button type="button" variant="outline" className="bg-transparent" onClick={() => fileInputRef.current?.click()} disabled={uploadImage.isPending}>
            {uploadImage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          </Button>
        </div>
        {imageUrl && <img src={imageUrl} alt="Preview" className="mt-2 w-20 h-20 object-cover rounded" />}
      </div>

      {/* Variants */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label>Variants</Label>
          <Button type="button" variant="outline" size="sm" className="bg-transparent" onClick={() => setVariants([...variants, { unitLabel: "", unitValue: "", price: "", stock: 0 }])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Variant
          </Button>
        </div>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <div key={i} className="grid grid-cols-5 gap-2 items-end">
              <div>
                <Label className="text-xs">Label *</Label>
                <Input value={v.unitLabel} onChange={e => { const nv = [...variants]; nv[i].unitLabel = e.target.value; setVariants(nv); }} className="bg-background" placeholder="5g" />
              </div>
              <div>
                <Label className="text-xs">Value</Label>
                <Input value={v.unitValue} onChange={e => { const nv = [...variants]; nv[i].unitValue = e.target.value; setVariants(nv); }} className="bg-background" placeholder="5" />
              </div>
              <div>
                <Label className="text-xs">Price *</Label>
                <Input value={v.price} onChange={e => { const nv = [...variants]; nv[i].price = e.target.value; setVariants(nv); }} className="bg-background" placeholder="9.99" />
              </div>
              <div>
                <Label className="text-xs">Stock</Label>
                <Input type="number" value={v.stock} onChange={e => { const nv = [...variants]; nv[i].stock = e.target.value; setVariants(nv); }} className="bg-background" placeholder="0" />
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-destructive" onClick={() => setVariants(variants.filter((_, j) => j !== i))} disabled={variants.length <= 1}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full gap-2">
        <Save className="h-4 w-4" /> {product ? "Update Product" : "Create Product"}
      </Button>
    </form>
  );
}

// ==================== PACKLIST TAB ====================
function AdminPacklist() {
  const { data: orders, isLoading } = trpc.orders.packList.useQuery();

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Orders Ready to Ship ({orders?.length || 0})</h2>
      {orders && orders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order: any) => (
            <Card key={order.id} className="bg-card border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-primary">{order.orderNumber}</span>
                  <Badge className="bg-yellow-500/20 text-yellow-400">Ready to Ship</Badge>
                </div>
                <div className="text-sm space-y-1">
                  <p className="font-semibold">{order.customerName}</p>
                  <p className="text-muted-foreground">{order.addressStreet}</p>
                  <p className="text-muted-foreground">{order.addressPostal} {order.addressCity}</p>
                  <p className="text-muted-foreground">{order.addressCountry}</p>
                </div>
                <div className="text-sm">
                  <p className="font-semibold">Items:</p>
                  {order.items?.map((item: any, i: number) => (
                    <p key={i} className="text-muted-foreground">
                      {item.productName} {item.unitLabel ? `(${item.unitLabel})` : ""} × {item.quantity}
                    </p>
                  ))}
                </div>
                <p className="font-bold text-primary">${parseFloat(order.totalAmount).toFixed(2)}</p>
                <a href={`/api/admin/packlist/${order.id}`} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2">
                    <Download className="h-4 w-4" /> Print Packlist
                  </Button>
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Truck className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">No orders ready to ship</p>
        </div>
      )}
    </div>
  );
}

// ==================== TICKETS TAB ====================
function AdminTickets() {
  const { data: tickets, isLoading } = trpc.tickets.listAll.useQuery();
  const utils = trpc.useUtils();
  const updateStatus = trpc.tickets.updateStatus.useMutation();
  const [selectedTicket, setSelectedTicket] = useState<number | null>(null);

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;

  if (selectedTicket) {
    return <AdminTicketDetail ticketId={selectedTicket} onBack={() => setSelectedTicket(null)} />;
  }

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticket #</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets && tickets.length > 0 ? tickets.map((ticket: any) => (
              <TableRow key={ticket.id}>
                <TableCell className="font-bold">{ticket.ticketNumber}</TableCell>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell>
                  <div>{ticket.customerName}</div>
                  <div className="text-xs text-muted-foreground">{ticket.customerEmail}</div>
                </TableCell>
                <TableCell>
                  <Select defaultValue={ticket.status} onValueChange={async v => {
                    await updateStatus.mutateAsync({ id: ticket.id, status: v });
                    toast.success("Status updated");
                    utils.tickets.listAll.invalidate();
                  }}>
                    <SelectTrigger className="w-32 bg-background"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{new Date(ticket.createdAt).toLocaleDateString("de-DE")}</TableCell>
                <TableCell>
                  <Button variant="outline" size="sm" className="bg-transparent" onClick={() => setSelectedTicket(ticket.id)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No tickets</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AdminTicketDetail({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { data: ticket, isLoading } = trpc.tickets.getById.useQuery({ id: ticketId });
  const utils = trpc.useUtils();
  const addMessage = trpc.tickets.addMessage.useMutation();
  const [reply, setReply] = useState("");

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  if (!ticket) return <p>Ticket not found</p>;

  const handleReply = async () => {
    if (!reply.trim()) return;
    await addMessage.mutateAsync({ ticketId, message: reply });
    setReply("");
    utils.tickets.getById.invalidate({ id: ticketId });
    toast.success("Reply sent");
  };

  return (
    <div>
      <Button variant="ghost" className="mb-4 text-muted-foreground" onClick={onBack}>← Back to Tickets</Button>
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>{ticket.subject}</CardTitle>
          <p className="text-sm text-muted-foreground">{ticket.ticketNumber} · {ticket.customerName} ({ticket.customerEmail})</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {ticket.messages?.map((msg: any) => (
              <div key={msg.id} className={`p-3 rounded-lg ${msg.senderType === "admin" ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{msg.senderName || msg.senderType}</span>
                  <Badge variant="outline" className="text-xs">{msg.senderType}</Badge>
                  <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString("de-DE")}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4 border-t border-border">
            <Textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Type admin reply..." className="bg-background" />
            <Button onClick={handleReply} disabled={addMessage.isPending || !reply.trim()} className="self-end">
              {addMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reply"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== SETTINGS TAB ====================
function AdminSettings() {
  const callbackUrl = typeof window !== "undefined" ? `${window.location.origin}/api/oxapay/callback` : "";

  return (
    <div className="space-y-6">
      {/* Shipping Options */}
      <AdminShipping />

      {/* Oxapay Settings */}
      <Card className="bg-card border-border max-w-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Oxapay Payment Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Callback URL (set this in your Oxapay dashboard)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={callbackUrl} readOnly className="bg-background font-mono text-sm" />
              <Button variant="outline" className="bg-transparent" onClick={() => { navigator.clipboard.writeText(callbackUrl); toast.success("Copied!"); }}>
                Copy
              </Button>
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-2">Setup Instructions:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Go to your Oxapay merchant dashboard</li>
              <li>Set the Merchant API Key as an environment variable (OXAPAY_MERCHANT_KEY)</li>
              <li>Set the callback URL above in your Oxapay settings</li>
              <li>Payments will be processed automatically</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
