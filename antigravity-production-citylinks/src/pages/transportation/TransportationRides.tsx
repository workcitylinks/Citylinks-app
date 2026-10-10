import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransporter } from "@/hooks/useTransporter";
import { supabase } from "@/integrations/supabase/client";
import TransportationLayout from "@/components/transportation/TransportationLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";

const statusColor: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  confirmed: "bg-blue-500/15 text-blue-600",
  in_progress: "bg-portal-transportation/15 text-portal-transportation",
  completed: "bg-emerald-500/15 text-emerald-600",
  cancelled: "bg-destructive/15 text-destructive",
};

const TransportationRides = () => {
  const { user } = useAuth();
  const { transporter } = useTransporter();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (transporter) fetchBookings();
  }, [transporter]);

  const fetchBookings = async () => {
    const { data } = await supabase.from("transport_bookings" as any).select("*").eq("transporter_id", transporter.id).order("created_at", { ascending: false });
    if (data) setBookings(data);
  };

  return (
    <TransportationLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Rides & Jobs</h1>

        {bookings.length === 0 ? (
          <Card className="glass p-12 text-center">
            <MapPin className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No ride requests yet. They'll appear here once customers book.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((b: any) => (
              <Card key={b.id} className="glass p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-foreground font-medium">
                        {new Date(b.scheduled_date).toLocaleDateString()}
                        {b.scheduled_time && ` at ${b.scheduled_time}`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">📍 {b.pickup_address} → {b.dropoff_address}</p>
                    {b.fare_amount && <p className="text-sm font-bold text-portal-transportation">₹{Number(b.fare_amount).toLocaleString()}</p>}
                  </div>
                  <Badge className={statusColor[b.status] || "bg-muted text-muted-foreground"}>
                    {b.status.replace("_", " ")}
                  </Badge>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TransportationLayout>
  );
};

export default TransportationRides;
