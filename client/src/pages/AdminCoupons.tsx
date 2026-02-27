import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Ticket, Plus, Trash2, Edit, Loader2, Copy, Percent, DollarSign, Calendar, Users, Hash
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminCoupons() {
  const { data: couponsList, isLoading } = trpc.coupons.list.useQuery();
  const utils = trpc.useUtils();
  const createCoupon = trpc.coupons.create.useMutation();
  const updateCoupon = trpc.coupons.update.useMutation();
  const deleteCoupon = trpc.coupons.delete.useMutation();

  const [showDialog, setShowDialog] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    minOrderAmount: "",
    maxDiscountAmount: "",
    usageLimit: "",
    perUserLimit: "",
    expiresAt: "",
    active: 1,
  });

  const resetForm = () => {
    setForm({
      code: "",
      description: "",
      discountType: "percentage",
      discountValue: "",
      minOrderAmount: "",
      maxDiscountAmount: "",
      usageLimit: "",
      perUserLimit: "",
      expiresAt: "",
      active: 1,
    });
    setEditingCoupon(null);
  };

  const openCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (coupon: any) => {
    setEditingCoupon(coupon);
    setForm({
      code: coupon.code,
      description: coupon.description || "",
      discountType: coupon.discountType,
      discountValue: String(coupon.discountValue),
      minOrderAmount: coupon.minOrderAmount ? String(coupon.minOrderAmount) : "",
      maxDiscountAmount: coupon.maxDiscountAmount ? String(coupon.maxDiscountAmount) : "",
      usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : "",
      perUserLimit: coupon.perUserLimit ? String(coupon.perUserLimit) : "",
      expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().slice(0, 16) : "",
      active: coupon.active,
    });
    setShowDialog(true);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "";
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(prev => ({ ...prev, code }));
  };

  const handleSave = async () => {
    if (!form.code || !form.discountValue) {
      toast.error("Code and discount value are required");
      return;
    }

    try {
      const payload: any = {
        code: form.code,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: form.discountValue,
        minOrderAmount: form.minOrderAmount || undefined,
        maxDiscountAmount: form.maxDiscountAmount || undefined,
        usageLimit: form.usageLimit ? parseInt(form.usageLimit) : undefined,
        perUserLimit: form.perUserLimit ? parseInt(form.perUserLimit) : undefined,
        expiresAt: form.expiresAt || undefined,
        active: form.active,
      };

      if (editingCoupon) {
        await updateCoupon.mutateAsync({ id: editingCoupon.id, ...payload });
        toast.success("Coupon updated");
      } else {
        await createCoupon.mutateAsync(payload);
        toast.success("Coupon created");
      }
      utils.coupons.list.invalidate();
      setShowDialog(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to save coupon");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this coupon?")) return;
    await deleteCoupon.mutateAsync({ id });
    toast.success("Coupon deleted");
    utils.coupons.list.invalidate();
  };

  const handleToggleActive = async (coupon: any) => {
    await updateCoupon.mutateAsync({ id: coupon.id, active: coupon.active === 1 ? 0 : 1 });
    utils.coupons.list.invalidate();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  if (isLoading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" />
            Coupons & Discount Codes
          </CardTitle>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Create Coupon
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min. Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {couponsList && couponsList.length > 0 ? couponsList.map((coupon: any) => {
                const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
                const isLimitReached = coupon.usageLimit && coupon.usageCount >= coupon.usageLimit;
                return (
                  <TableRow key={coupon.id} className={isExpired || isLimitReached ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="bg-primary/10 text-primary px-2 py-0.5 rounded font-mono font-bold text-sm">
                          {coupon.code}
                        </code>
                        <button onClick={() => copyCode(coupon.code)} className="text-muted-foreground hover:text-foreground">
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {coupon.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 max-w-48 truncate">{coupon.description}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        {coupon.discountType === "percentage" ? (
                          <><Percent className="h-3 w-3" /> {parseFloat(coupon.discountValue)}%</>
                        ) : (
                          <><DollarSign className="h-3 w-3" /> {parseFloat(coupon.discountValue).toFixed(2)}</>
                        )}
                      </Badge>
                      {coupon.maxDiscountAmount && coupon.discountType === "percentage" && (
                        <p className="text-xs text-muted-foreground mt-0.5">Max: ${parseFloat(coupon.maxDiscountAmount).toFixed(2)}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {coupon.minOrderAmount ? `$${parseFloat(coupon.minOrderAmount).toFixed(2)}` : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{coupon.usageCount}</span>
                        {coupon.usageLimit && (
                          <span className="text-muted-foreground">/ {coupon.usageLimit}</span>
                        )}
                      </div>
                      {coupon.perUserLimit && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Users className="h-3 w-3" /> {coupon.perUserLimit}/user
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {coupon.expiresAt ? (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={isExpired ? "text-destructive" : ""}>
                            {new Date(coupon.expiresAt).toLocaleDateString()}
                          </span>
                          {isExpired && <Badge variant="destructive" className="text-xs ml-1">Expired</Badge>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No expiry</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={coupon.active === 1}
                        onCheckedChange={() => handleToggleActive(coupon)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="outline" size="sm" className="bg-transparent" onClick={() => openEdit(coupon)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="sm" className="bg-transparent text-destructive hover:text-destructive" onClick={() => handleDelete(coupon.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Ticket className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p>No coupons created yet</p>
                    <p className="text-xs mt-1">Create your first discount code to attract customers</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? "Edit Coupon" : "Create New Coupon"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Coupon Code *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={form.code}
                  onChange={e => setForm(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SUMMER20"
                  className="bg-background font-mono"
                />
                <Button variant="outline" className="bg-transparent shrink-0" onClick={generateCode} type="button">
                  Generate
                </Button>
              </div>
            </div>

            <div>
              <Label>Description (optional)</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. Summer sale 20% off"
                className="bg-background mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Type *</Label>
                <Select value={form.discountType} onValueChange={(v: "percentage" | "fixed") => setForm(prev => ({ ...prev, discountType: v }))}>
                  <SelectTrigger className="bg-background mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Discount Value *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.discountValue}
                  onChange={e => setForm(prev => ({ ...prev, discountValue: e.target.value }))}
                  placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 10.00"}
                  className="bg-background mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Min. Order Amount ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.minOrderAmount}
                  onChange={e => setForm(prev => ({ ...prev, minOrderAmount: e.target.value }))}
                  placeholder="No minimum"
                  className="bg-background mt-1"
                />
              </div>
              {form.discountType === "percentage" && (
                <div>
                  <Label>Max. Discount ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.maxDiscountAmount}
                    onChange={e => setForm(prev => ({ ...prev, maxDiscountAmount: e.target.value }))}
                    placeholder="No maximum"
                    className="bg-background mt-1"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Total Usage Limit</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.usageLimit}
                  onChange={e => setForm(prev => ({ ...prev, usageLimit: e.target.value }))}
                  placeholder="Unlimited"
                  className="bg-background mt-1"
                />
              </div>
              <div>
                <Label>Per User Limit</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.perUserLimit}
                  onChange={e => setForm(prev => ({ ...prev, perUserLimit: e.target.value }))}
                  placeholder="Unlimited"
                  className="bg-background mt-1"
                />
              </div>
            </div>

            <div>
              <Label>Expiration Date</Label>
              <Input
                type="datetime-local"
                value={form.expiresAt}
                onChange={e => setForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                className="bg-background mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Leave empty for no expiration</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createCoupon.isPending || updateCoupon.isPending}>
              {(createCoupon.isPending || updateCoupon.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
