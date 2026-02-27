import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import {
  Truck, Plus, Trash2, Edit, Loader2, GripVertical, Package
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function AdminShipping() {
  const { data: options, isLoading } = trpc.shipping.listAll.useQuery();
  const utils = trpc.useUtils();
  const createOption = trpc.shipping.create.useMutation();
  const updateOption = trpc.shipping.update.useMutation();
  const deleteOption = trpc.shipping.delete.useMutation();

  const [showDialog, setShowDialog] = useState(false);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    currency: "USD",
    estimatedDays: "",
    active: 1,
    sortOrder: 0,
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      price: "",
      currency: "USD",
      estimatedDays: "",
      active: 1,
      sortOrder: 0,
    });
    setEditingOption(null);
  };

  const openCreate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEdit = (option: any) => {
    setEditingOption(option);
    setForm({
      name: option.name,
      description: option.description || "",
      price: String(option.price),
      currency: option.currency || "USD",
      estimatedDays: option.estimatedDays || "",
      active: option.active,
      sortOrder: option.sortOrder || 0,
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.price) {
      toast.error("Name and price are required");
      return;
    }

    try {
      if (editingOption) {
        await updateOption.mutateAsync({
          id: editingOption.id,
          ...form,
          description: form.description || undefined,
          estimatedDays: form.estimatedDays || undefined,
        });
        toast.success("Shipping option updated");
      } else {
        await createOption.mutateAsync({
          ...form,
          description: form.description || undefined,
          estimatedDays: form.estimatedDays || undefined,
        });
        toast.success("Shipping option created");
      }
      utils.shipping.listAll.invalidate();
      utils.shipping.list.invalidate();
      setShowDialog(false);
      resetForm();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this shipping option?")) return;
    await deleteOption.mutateAsync({ id });
    toast.success("Shipping option deleted");
    utils.shipping.listAll.invalidate();
    utils.shipping.list.invalidate();
  };

  const handleToggleActive = async (option: any) => {
    await updateOption.mutateAsync({
      id: option.id,
      active: option.active === 1 ? 0 : 1,
    });
    utils.shipping.listAll.invalidate();
    utils.shipping.list.invalidate();
  };

  if (isLoading) {
    return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Shipping Options
          </CardTitle>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Option
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Est. Delivery</TableHead>
                <TableHead className="text-center">Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {options && options.length > 0 ? options.map((opt: any) => (
                <TableRow key={opt.id}>
                  <TableCell className="text-muted-foreground">
                    <GripVertical className="h-4 w-4" />
                    <span className="ml-1">{opt.sortOrder}</span>
                  </TableCell>
                  <TableCell className="font-semibold">{opt.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-48 truncate">{opt.description || "—"}</TableCell>
                  <TableCell>
                    {parseFloat(opt.price) === 0 ? (
                      <Badge className="bg-green-500/20 text-green-400">Free</Badge>
                    ) : (
                      <span className="font-medium">${parseFloat(opt.price).toFixed(2)}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {opt.estimatedDays ? `${opt.estimatedDays} days` : "—"}
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={opt.active === 1}
                      onCheckedChange={() => handleToggleActive(opt)}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="outline" size="sm" className="bg-transparent" onClick={() => openEdit(opt)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" className="bg-transparent text-destructive hover:text-destructive" onClick={() => handleDelete(opt.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                    <p>No shipping options configured</p>
                    <p className="text-xs mt-1">Add shipping options for your customers</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingOption ? "Edit Shipping Option" : "New Shipping Option"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Standard Shipping"
                className="bg-background mt-1"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="e.g. Delivery within 5-7 business days"
                className="bg-background mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Price ($) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={e => setForm(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="0.00"
                  className="bg-background mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">Set to 0 for free shipping</p>
              </div>
              <div>
                <Label>Estimated Days</Label>
                <Input
                  value={form.estimatedDays}
                  onChange={e => setForm(prev => ({ ...prev, estimatedDays: e.target.value }))}
                  placeholder="e.g. 3-5"
                  className="bg-background mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Sort Order</Label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                className="bg-background mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="bg-transparent" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={createOption.isPending || updateOption.isPending}>
              {(createOption.isPending || updateOption.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
