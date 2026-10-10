import { useEffect, useState } from "react";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Clock, AlertTriangle, CheckCircle2, MessageSquare } from "lucide-react";

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  customer_id: string;
  created_at: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const EmployeeSupport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setTickets(data as Ticket[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const updateTicketStatus = async (ticketId: string, status: string) => {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status, assigned_to: user?.id, updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (!error) {
      toast({ title: "Ticket updated", description: `Status set to ${status}` });
      fetchTickets();
    }
  };

  const filtered = (status: string) => tickets.filter((t) => t.status === status);

  const TicketCard = ({ ticket }: { ticket: Ticket }) => (
    <Card className="glass hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
              <Badge className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
            </div>
            <p className="font-semibold text-foreground mt-1">{ticket.subject}</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {new Date(ticket.created_at).toLocaleString()}
          </div>
          <Select
            value={ticket.status}
            onValueChange={(value) => updateTicketStatus(ticket.id, value)}
          >
            <SelectTrigger className="w-36 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-display font-bold text-foreground">Support Inbox</h1>

        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open ({filtered("open").length})</TabsTrigger>
            <TabsTrigger value="in_progress">In Progress ({filtered("in_progress").length})</TabsTrigger>
            <TabsTrigger value="resolved">Resolved ({filtered("resolved").length})</TabsTrigger>
            <TabsTrigger value="closed">Closed ({filtered("closed").length})</TabsTrigger>
          </TabsList>

          {["open", "in_progress", "resolved", "closed"].map((status) => (
            <TabsContent key={status} value={status}>
              {loading ? (
                <p className="text-sm text-muted-foreground p-4">Loading...</p>
              ) : filtered(status).length === 0 ? (
                <Card className="glass">
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-muted-foreground">No {status.replace("_", " ")} tickets.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filtered(status).map((t) => <TicketCard key={t.id} ticket={t} />)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeSupport;
