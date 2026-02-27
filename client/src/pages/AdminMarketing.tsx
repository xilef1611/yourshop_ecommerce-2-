import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Mail, Send, Users, Plus, Trash2, Eye, Edit, Loader2, AlertTriangle, CheckCircle, Clock, XCircle
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";

const SEGMENTS = [
  { value: "all", label: "All Customers", description: "Every customer who has placed an order" },
  { value: "repeat", label: "Repeat Customers", description: "Customers with 2+ orders" },
  { value: "new", label: "New Customers", description: "Customers with exactly 1 order" },
  { value: "high_value", label: "High-Value Customers", description: "Customers above a spending threshold" },
  { value: "category", label: "Category Buyers", description: "Customers who bought from a specific category" },
  { value: "registered", label: "Registered Users", description: "All registered users with email" },
];

const PLACEHOLDERS = [
  { tag: "{{name}}", description: "Customer name" },
  { tag: "{{email}}", description: "Customer email" },
];

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  draft: { icon: <Edit className="h-3.5 w-3.5" />, color: "bg-gray-500/20 text-gray-400", label: "Draft" },
  sending: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, color: "bg-blue-500/20 text-blue-400", label: "Sending" },
  sent: { icon: <CheckCircle className="h-3.5 w-3.5" />, color: "bg-green-500/20 text-green-400", label: "Sent" },
  failed: { icon: <XCircle className="h-3.5 w-3.5" />, color: "bg-red-500/20 text-red-400", label: "Failed" },
};

export default function AdminMarketing() {
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editId, setEditId] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Marketing Emails
        </h2>
        {view === "list" && (
          <Button className="gap-2" onClick={() => { setView("create"); setEditId(null); }}>
            <Plus className="h-4 w-4" /> New Campaign
          </Button>
        )}
      </div>

      {view === "list" && <CampaignList onEdit={(id) => { setEditId(id); setView("edit"); }} />}
      {view === "create" && <CampaignEditor onBack={() => setView("list")} />}
      {view === "edit" && editId && <CampaignEditor campaignId={editId} onBack={() => setView("list")} />}
    </div>
  );
}

// ==================== CAMPAIGN LIST ====================
function CampaignList({ onEdit }: { onEdit: (id: number) => void }) {
  const { data: campaigns, isLoading } = trpc.marketing.campaigns.list.useQuery();
  const utils = trpc.useUtils();
  const deleteCampaign = trpc.marketing.campaigns.delete.useMutation();
  const sendCampaign = trpc.marketing.campaigns.send.useMutation();

  if (isLoading) return <div className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this campaign?")) return;
    await deleteCampaign.mutateAsync({ id });
    toast.success("Campaign deleted");
    utils.marketing.campaigns.list.invalidate();
  };

  const handleSend = async (id: number) => {
    if (!confirm("Send this campaign to all recipients? This action cannot be undone.")) return;
    try {
      const result = await sendCampaign.mutateAsync({ id });
      toast.success(`Campaign sent to ${result.sentCount}/${result.totalRecipients} recipients`);
      utils.marketing.campaigns.list.invalidate();
    } catch (e: any) {
      toast.error(e.message || "Failed to send campaign");
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Segment</TableHead>
              <TableHead className="text-center">Recipients</TableHead>
              <TableHead className="text-center">Sent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns && campaigns.length > 0 ? campaigns.map((c: any) => {
              const statusCfg = STATUS_CONFIG[c.status] || STATUS_CONFIG.draft;
              return (
                <TableRow key={c.id}>
                  <TableCell>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-48">{c.subject}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {SEGMENTS.find(s => s.value === c.segment)?.label || c.segment}
                    </Badge>
                    {c.segmentValue && <span className="text-xs text-muted-foreground ml-1">({c.segmentValue})</span>}
                  </TableCell>
                  <TableCell className="text-center">{c.recipientCount}</TableCell>
                  <TableCell className="text-center">{c.sentCount}</TableCell>
                  <TableCell>
                    <Badge className={`gap-1 ${statusCfg.color}`}>
                      {statusCfg.icon} {statusCfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {c.sentAt ? new Date(c.sentAt).toLocaleDateString("de-DE") : new Date(c.createdAt).toLocaleDateString("de-DE")}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {c.status === "draft" && (
                        <>
                          <Button variant="outline" size="sm" className="bg-transparent" onClick={() => onEdit(c.id)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="sm" className="bg-transparent text-green-400 hover:text-green-300" onClick={() => handleSend(c.id)} disabled={sendCampaign.isPending}>
                            <Send className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                      <Button variant="outline" size="sm" className="bg-transparent text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p>No campaigns yet</p>
                  <p className="text-xs mt-1">Create your first marketing campaign</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ==================== CAMPAIGN EDITOR ====================
function CampaignEditor({ campaignId, onBack }: { campaignId?: number; onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data: existingCampaign } = trpc.marketing.campaigns.getById.useQuery(
    { id: campaignId! },
    { enabled: !!campaignId }
  );
  const { data: categories } = trpc.products.categories.useQuery();

  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
    segment: "all",
    segmentValue: "",
  });

  // Load existing campaign data
  useEffect(() => {
    if (existingCampaign) {
      setForm({
        name: existingCampaign.name,
        subject: existingCampaign.subject,
        body: existingCampaign.body,
        segment: existingCampaign.segment,
        segmentValue: existingCampaign.segmentValue || "",
      });
    }
  }, [existingCampaign]);

  const segmentPreviewInput = useMemo(() => ({
    segment: form.segment,
    segmentValue: form.segmentValue || undefined,
  }), [form.segment, form.segmentValue]);

  const { data: segmentPreview, isLoading: previewLoading } = trpc.marketing.segmentPreview.useQuery(segmentPreviewInput);

  const createCampaign = trpc.marketing.campaigns.create.useMutation();
  const updateCampaign = trpc.marketing.campaigns.update.useMutation();

  const handleSubmit = async () => {
    if (!form.name || !form.subject || !form.body) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (campaignId) {
        await updateCampaign.mutateAsync({ id: campaignId, ...form, segmentValue: form.segmentValue || undefined });
        toast.success("Campaign updated");
      } else {
        await createCampaign.mutateAsync({ ...form, segmentValue: form.segmentValue || undefined });
        toast.success("Campaign created");
      }
      utils.marketing.campaigns.list.invalidate();
      onBack();
    } catch (e: any) {
      toast.error(e.message || "Failed to save campaign");
    }
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const insertPlaceholder = (tag: string) => {
    setForm(prev => ({ ...prev, body: prev.body + tag }));
  };

  const needsSegmentValue = form.segment === "high_value" || form.segment === "category";

  return (
    <div className="space-y-6">
      <Button variant="ghost" className="text-muted-foreground" onClick={onBack}>
        ← Back to Campaigns
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">
                {campaignId ? "Edit Campaign" : "New Campaign"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Campaign Name *</Label>
                <Input
                  value={form.name}
                  onChange={e => updateField("name", e.target.value)}
                  placeholder="e.g. Summer Sale Announcement"
                  className="bg-background mt-1"
                />
              </div>

              <Separator />

              {/* Segment Selection */}
              <div>
                <Label>Target Segment *</Label>
                <Select value={form.segment} onValueChange={v => updateField("segment", v)}>
                  <SelectTrigger className="bg-background mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map(s => (
                      <SelectItem key={s.value} value={s.value}>
                        <div>
                          <span className="font-medium">{s.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">{s.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {needsSegmentValue && (
                <div>
                  <Label>
                    {form.segment === "high_value" ? "Minimum Spend ($)" : "Category Name"}
                  </Label>
                  {form.segment === "category" && categories ? (
                    <Select value={form.segmentValue} onValueChange={v => updateField("segmentValue", v)}>
                      <SelectTrigger className="bg-background mt-1">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat: string) => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={form.segmentValue}
                      onChange={e => updateField("segmentValue", e.target.value)}
                      placeholder={form.segment === "high_value" ? "100" : "Category name"}
                      className="bg-background mt-1"
                    />
                  )}
                </div>
              )}

              <Separator />

              {/* Email Content */}
              <div>
                <Label>Email Subject *</Label>
                <Input
                  value={form.subject}
                  onChange={e => updateField("subject", e.target.value)}
                  placeholder="e.g. Hey {{name}}, check out our new deals!"
                  className="bg-background mt-1"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label>Email Body *</Label>
                  <div className="flex gap-1">
                    {PLACEHOLDERS.map(p => (
                      <Button
                        key={p.tag}
                        variant="outline"
                        size="sm"
                        className="bg-transparent text-xs h-7"
                        onClick={() => insertPlaceholder(p.tag)}
                        title={p.description}
                      >
                        {p.tag}
                      </Button>
                    ))}
                  </div>
                </div>
                <Textarea
                  value={form.body}
                  onChange={e => updateField("body", e.target.value)}
                  placeholder="Write your marketing email here. Use {{name}} and {{email}} for personalization..."
                  className="bg-background min-h-48"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {form.body && (
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  Email Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-background rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground mb-1">Subject:</p>
                  <p className="font-semibold mb-3">
                    {form.subject.replace(/\{\{name\}\}/g, "John Doe").replace(/\{\{email\}\}/g, "john@example.com")}
                  </p>
                  <Separator className="my-3" />
                  <p className="text-sm whitespace-pre-wrap">
                    {form.body.replace(/\{\{name\}\}/g, "John Doe").replace(/\{\{email\}\}/g, "john@example.com")}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Segment Preview */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Segment Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {previewLoading ? (
                <div className="text-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-primary" />
                </div>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <p className="text-3xl font-bold text-primary">{segmentPreview?.count || 0}</p>
                    <p className="text-sm text-muted-foreground">Recipients</p>
                  </div>
                  {segmentPreview?.customers && segmentPreview.customers.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      <p className="text-xs text-muted-foreground font-semibold">Preview (first 50):</p>
                      {segmentPreview.customers.map((c: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs p-1.5 rounded bg-muted">
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-bold flex-shrink-0">
                            {(c.name || c.email || "?")[0].toUpperCase()}
                          </div>
                          <div className="truncate">
                            <p className="font-medium truncate">{c.name || "Unknown"}</p>
                            <p className="text-muted-foreground truncate">{c.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {(!segmentPreview?.customers || segmentPreview.customers.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center">No customers match this segment</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Placeholders Info */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-base">Personalization Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {PLACEHOLDERS.map(p => (
                  <div key={p.tag} className="flex items-center justify-between text-sm">
                    <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{p.tag}</code>
                    <span className="text-muted-foreground text-xs">{p.description}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full gap-2" onClick={handleSubmit} disabled={createCampaign.isPending || updateCampaign.isPending}>
              {(createCampaign.isPending || updateCampaign.isPending) ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>{campaignId ? "Update Campaign" : "Save as Draft"}</>
              )}
            </Button>
            <Button variant="outline" className="w-full bg-transparent" onClick={onBack}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
