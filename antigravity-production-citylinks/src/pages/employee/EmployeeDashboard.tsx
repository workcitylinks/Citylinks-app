import { useEffect, useState } from "react";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Inbox, Store, ScrollText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const EmployeeDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pendingApprovals: 0,
    openTickets: 0,
    totalMerchants: 0,
    recentLogs: 0,
  });
  const [employee, setEmployee] = useState<{ tier: string; title: string | null } | null>(null);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [empRes, merchantRes, ticketRes, logRes, msgRes] = await Promise.all([
        supabase.from("employees").select("tier, title").eq("user_id", user.id).single(),
        supabase.from("merchants").select("id", { count: "exact", head: true }).eq("approval_status", "pending"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("audit_logs").select("id", { count: "exact", head: true }),
        supabase.from("internal_messages").select("*").eq("recipient_id", user.id).eq("is_read", false).order("created_at", { ascending: false }).limit(5),
      ]);

      if (empRes.data) setEmployee(empRes.data);
      setStats({
        pendingApprovals: merchantRes.count || 0,
        openTickets: ticketRes.count || 0,
        totalMerchants: 0,
        recentLogs: logRes.count || 0,
      });
      if (msgRes.data) setRecentMessages(msgRes.data);

      // Get total merchants separately
      const totalRes = await supabase.from("merchants").select("id", { count: "exact", head: true });
      setStats(prev => ({ ...prev, totalMerchants: totalRes.count || 0 }));
    };

    fetchData();
  }, [user]);

  const tierLabels: Record<string, string> = {
    A1: "Admin",
    A2: "District Manager",
    A3: "Taluq Manager",
    A4: "Hobli Agent",
  };

  const statCards = [
    { label: "Pending Approvals", value: stats.pendingApprovals, icon: ShieldCheck, color: "text-amber-500", onClick: () => navigate("/employee/approvals") },
    { label: "Open Tickets", value: stats.openTickets, icon: Inbox, color: "text-blue-500", onClick: () => navigate("/employee/support") },
    { label: "Total Merchants", value: stats.totalMerchants, icon: Store, color: "text-emerald-500", onClick: () => navigate("/employee/approvals") },
    { label: "Audit Events", value: stats.recentLogs, icon: ScrollText, color: "text-purple-500", onClick: () => navigate("/employee/audit") },
  ];

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Employee Dashboard
          </h1>
          {employee && (
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="bg-portal-employee/10 text-portal-employee border-portal-employee/30">
                {employee.tier}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {tierLabels[employee.tier] || employee.title || "Employee"}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card
              key={stat.label}
              className="glass cursor-pointer hover:shadow-md transition-shadow"
              onClick={stat.onClick}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl bg-accent flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg font-display">Unread Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {recentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No unread messages.</p>
            ) : (
              <div className="space-y-3">
                {recentMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-3 p-3 rounded-xl bg-accent/50">
                    <div className="w-2 h-2 rounded-full bg-portal-employee mt-2 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{msg.subject}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1">{msg.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(msg.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeDashboard;
