import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User, Save, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

export default function Account() {
  const { user, loading: authLoading, isAuthenticated, refresh } = useAuth();
  const updateProfile = trpc.profile.update.useMutation();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    addressStreet: "",
    addressCity: "",
    addressPostal: "",
    addressCountry: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        phone: (user as any).phone || "",
        addressStreet: (user as any).addressStreet || "",
        addressCity: (user as any).addressCity || "",
        addressPostal: (user as any).addressPostal || "",
        addressCountry: (user as any).addressCountry || "",
      });
    }
  }, [user]);

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
        <User className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold mb-3">Login Required</h1>
        <p className="text-muted-foreground mb-6">Please login to manage your account.</p>
        <a href={getLoginUrl()}>
          <Button>Login</Button>
        </a>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateProfile.mutateAsync(form);
      toast.success("Profile updated successfully");
      refresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile");
    }
  };

  return (
    <div className="container py-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
        <User className="h-6 w-6 text-primary" />
        My Account
      </h1>

      <form onSubmit={handleSubmit}>
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className="bg-background" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className="bg-background" />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className="bg-background" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Default Shipping Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="street">Street</Label>
              <Input id="street" value={form.addressStreet} onChange={e => setForm(p => ({ ...p, addressStreet: e.target.value }))} className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.addressCity} onChange={e => setForm(p => ({ ...p, addressCity: e.target.value }))} className="bg-background" />
              </div>
              <div>
                <Label htmlFor="postal">Postal Code</Label>
                <Input id="postal" value={form.addressPostal} onChange={e => setForm(p => ({ ...p, addressPostal: e.target.value }))} className="bg-background" />
              </div>
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" value={form.addressCountry} onChange={e => setForm(p => ({ ...p, addressCountry: e.target.value }))} className="bg-background" />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="mt-6 gap-2" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </form>
    </div>
  );
}
