import { useEffect, useState } from "react";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollText, Search } from "lucide-react";

interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const actionColors: Record<string, string> = {
  merchant_approved: "bg-emerald-100 text-emerald-700",
  merchant_rejected: "bg-red-100 text-red-700",
  login: "bg-blue-100 text-blue-700",
  mfa_attempt: "bg-amber-100 text-amber-700",
};

const EmployeeAudit = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (data) setLogs(data as AuditLog[]);
      setLoading(false);
    };
    fetchLogs();
  }, []);

  const filtered = logs.filter(
    (l) =>
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      (l.entity_type || "").toLowerCase().includes(search.toLowerCase()) ||
      JSON.stringify(l.details || {}).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-display font-bold text-foreground">Audit Logs</h1>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <ScrollText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-muted-foreground">No audit logs found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => (
              <Card key={log.id} className="glass">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shrink-0">
                    <ScrollText className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge className={actionColors[log.action] || "bg-secondary text-secondary-foreground"}>
                        {log.action.replace(/_/g, " ")}
                      </Badge>
                      {log.entity_type && (
                        <span className="text-xs text-muted-foreground">{log.entity_type}</span>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {Object.entries(log.details).map(([k, v]) => `${k}: ${v}`).join(" • ")}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeAudit;
