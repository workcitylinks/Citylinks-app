import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransporter } from "@/hooks/useTransporter";
import { supabase } from "@/integrations/supabase/client";
import TransportationLayout from "@/components/transportation/TransportationLayout";
import { Card } from "@/components/ui/card";
import { IndianRupee, TrendingUp, CheckCircle2, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TransportationEarnings = () => {
  const { user } = useAuth();
  const { transporter } = useTransporter();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (transporter) fetchEarnings();
  }, [transporter]);

  const fetchEarnings = async () => {
    const { data } = await supabase.from("transport_bookings" as any).select("*").eq("transporter_id", transporter.id);
    if (data) {
      const completed = data.filter((b: any) => b.status === "completed");
      const pending = data.filter((b: any) => b.status === "pending" || b.status === "confirmed");
      setStats({
        total: completed.reduce((s: number, b: any) => s + (Number(b.fare_amount) || 0), 0),
        completed: completed.length,
        pending: pending.length,
      });
    }
  };

  const cards = [
    { label: "Total Earnings", value: `₹${stats.total.toLocaleString()}`, icon: IndianRupee, color: "text-portal-transportation", bg: "bg-portal-transportation/10" },
    { label: "Completed Rides", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Pending Jobs", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  return (
    <TransportationLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Earnings</h1>
        <div className="grid gap-4 sm:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.label} className="glass p-5">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{c.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
            </Card>
          ))}
        </div>
      </div>
    </TransportationLayout>
  );
};

export default TransportationEarnings;
