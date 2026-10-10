import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LaborLayout from "@/components/labor/LaborLayout";
import { motion } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  CalendarDays,
  MapPin,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Play,
  Briefcase,
} from "lucide-react";

interface Booking {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string | null;
  address: string | null;
  notes: string | null;
  total_amount: number | null;
  rating: number | null;
  review: string | null;
}

const LaborJobs = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("service_bookings")
      .select("*")
      .eq("labor_id", user.id)
      .order("scheduled_date", { ascending: false });
    if (data) setBookings(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchBookings();
  }, [user]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("service_bookings")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Job marked as ${status.replace("_", " ")}` });
      fetchBookings();
    }
  };

  const filterByStatus = (statuses: string[]) =>
    bookings.filter((b) => statuses.includes(b.status));

  const statusColor: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-600",
    confirmed: "bg-blue-500/15 text-blue-600",
    in_progress: "bg-portal-labor/15 text-portal-labor",
    completed: "bg-emerald-500/15 text-emerald-600",
    cancelled: "bg-destructive/15 text-destructive",
  };

  const JobCard = ({ booking }: { booking: Booking }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-5 space-y-3"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="w-4 h-4" />
            <span>
              {new Date(booking.scheduled_date).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
              {booking.scheduled_time && ` • ${booking.scheduled_time}`}
            </span>
          </div>
          {booking.address && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{booking.address}</span>
            </div>
          )}
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-medium ${
            statusColor[booking.status] || "bg-muted text-muted-foreground"
          }`}
        >
          {booking.status.replace("_", " ")}
        </span>
      </div>

      {booking.notes && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground bg-accent/50 rounded-xl p-3">
          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{booking.notes}</span>
        </div>
      )}

      {booking.total_amount && (
        <p className="text-lg font-display font-bold text-foreground">
          ₹{Number(booking.total_amount).toLocaleString()}
        </p>
      )}

      {booking.rating && (
        <div className="text-sm text-muted-foreground">
          {"★".repeat(booking.rating)}{"☆".repeat(5 - booking.rating)}
          {booking.review && <span className="ml-2">"{booking.review}"</span>}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        {booking.status === "pending" && (
          <>
            <Button
              size="sm"
              onClick={() => updateStatus(booking.id, "confirmed")}
              className="bg-portal-labor text-primary-foreground hover:bg-portal-labor/90"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => updateStatus(booking.id, "cancelled")}
            >
              <XCircle className="w-4 h-4 mr-1" /> Decline
            </Button>
          </>
        )}
        {booking.status === "confirmed" && (
          <Button
            size="sm"
            onClick={() => updateStatus(booking.id, "in_progress")}
            className="bg-portal-labor text-primary-foreground hover:bg-portal-labor/90"
          >
            <Play className="w-4 h-4 mr-1" /> Start Job
          </Button>
        )}
        {booking.status === "in_progress" && (
          <Button
            size="sm"
            onClick={() => updateStatus(booking.id, "completed")}
            className="bg-emerald-600 text-primary-foreground hover:bg-emerald-700"
          >
            <CheckCircle2 className="w-4 h-4 mr-1" /> Complete
          </Button>
        )}
      </div>
    </motion.div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="text-center py-16">
      <Briefcase className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );

  return (
    <LaborLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Jobs
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your service bookings
          </p>
        </div>

        <Tabs defaultValue="active">
          <TabsList className="glass">
            <TabsTrigger value="active">
              Active ({filterByStatus(["pending", "confirmed", "in_progress"]).length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed ({filterByStatus(["completed"]).length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Cancelled ({filterByStatus(["cancelled"]).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4 space-y-4">
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : filterByStatus(["pending", "confirmed", "in_progress"]).length === 0 ? (
              <EmptyState message="No active jobs" />
            ) : (
              filterByStatus(["pending", "confirmed", "in_progress"]).map((b) => (
                <JobCard key={b.id} booking={b} />
              ))
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-4 space-y-4">
            {filterByStatus(["completed"]).length === 0 ? (
              <EmptyState message="No completed jobs yet" />
            ) : (
              filterByStatus(["completed"]).map((b) => (
                <JobCard key={b.id} booking={b} />
              ))
            )}
          </TabsContent>

          <TabsContent value="cancelled" className="mt-4 space-y-4">
            {filterByStatus(["cancelled"]).length === 0 ? (
              <EmptyState message="No cancelled jobs" />
            ) : (
              filterByStatus(["cancelled"]).map((b) => (
                <JobCard key={b.id} booking={b} />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </LaborLayout>
  );
};

export default LaborJobs;
