import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Plus, Loader2, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const statusColors: Record<string, string> = {
  open: "bg-blue-500/20 text-blue-400",
  in_progress: "bg-yellow-500/20 text-yellow-400",
  resolved: "bg-green-500/20 text-green-400",
  closed: "bg-gray-500/20 text-gray-400",
};

export default function Tickets() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: tickets, isLoading } = trpc.tickets.myTickets.useQuery(undefined, { enabled: isAuthenticated });
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  if (authLoading) {
    return <div className="container py-20 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="container py-20 text-center">
        <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
        <h1 className="text-2xl font-bold mb-3">Login Required</h1>
        <p className="text-muted-foreground mb-6">Please login to access support.</p>
        <a href={getLoginUrl()}><Button>Login</Button></a>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" />
          Support Tickets
        </h1>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New Ticket</Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <CreateTicketForm onSuccess={() => { setShowCreate(false); utils.tickets.myTickets.invalidate(); }} />
          </DialogContent>
        </Dialog>
      </div>

      {selectedTicketId ? (
        <TicketDetail ticketId={selectedTicketId} onBack={() => setSelectedTicketId(null)} />
      ) : (
        <>
          {isLoading ? (
            <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>
          ) : tickets && tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map((ticket: any) => (
                <Card key={ticket.id} className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedTicketId(ticket.id)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">{ticket.subject}</span>
                        <Badge className={statusColors[ticket.status] || "bg-gray-500/20 text-gray-400"}>
                          {ticket.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {ticket.ticketNumber} · {new Date(ticket.createdAt).toLocaleDateString("de-DE")}
                      </p>
                    </div>
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
              <h2 className="text-xl font-semibold mb-2">No tickets yet</h2>
              <p className="text-muted-foreground">Create a ticket if you need help.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CreateTicketForm({ onSuccess }: { onSuccess: () => void }) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const createTicket = trpc.tickets.create.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) { toast.error("Please fill in all fields"); return; }
    try {
      await createTicket.mutateAsync({ subject, message });
      toast.success("Ticket created successfully");
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to create ticket");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" value={subject} onChange={e => setSubject(e.target.value)} className="bg-background" required />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} className="bg-background min-h-[120px]" required />
      </div>
      <Button type="submit" className="w-full gap-2" disabled={createTicket.isPending}>
        {createTicket.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        Submit Ticket
      </Button>
    </form>
  );
}

function TicketDetail({ ticketId, onBack }: { ticketId: number; onBack: () => void }) {
  const { data: ticket, isLoading } = trpc.tickets.getById.useQuery({ id: ticketId });
  const utils = trpc.useUtils();
  const addMessage = trpc.tickets.addMessage.useMutation();
  const [newMessage, setNewMessage] = useState("");

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    try {
      await addMessage.mutateAsync({ ticketId, message: newMessage });
      setNewMessage("");
      utils.tickets.getById.invalidate({ id: ticketId });
    } catch (error: any) {
      toast.error(error.message || "Failed to send message");
    }
  };

  if (isLoading) return <div className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></div>;
  if (!ticket) return <p>Ticket not found</p>;

  return (
    <div>
      <Button variant="ghost" className="mb-4 text-muted-foreground" onClick={onBack}>← Back to Tickets</Button>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{ticket.subject}</CardTitle>
            <Badge className={statusColors[ticket.status] || "bg-gray-500/20 text-gray-400"}>
              {ticket.status.replace(/_/g, " ")}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{ticket.ticketNumber}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Messages */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {ticket.messages?.map((msg: any) => (
              <div key={msg.id} className={`p-3 rounded-lg ${msg.senderType === "admin" ? "bg-primary/10 border border-primary/20" : "bg-muted"}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{msg.senderName || msg.senderType}</span>
                  <span className="text-xs text-muted-foreground">{new Date(msg.createdAt).toLocaleString("de-DE")}</span>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{msg.message}</p>
              </div>
            ))}
          </div>

          {/* Reply */}
          {ticket.status !== "closed" && (
            <div className="flex gap-2 pt-4 border-t border-border">
              <Textarea
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Type your reply..."
                className="bg-background min-h-[60px]"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              />
              <Button onClick={handleSend} disabled={addMessage.isPending || !newMessage.trim()} className="self-end">
                {addMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
