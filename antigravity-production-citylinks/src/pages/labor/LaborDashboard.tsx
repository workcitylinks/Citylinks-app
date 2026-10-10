import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useLaborProfile } from "@/hooks/useLaborProfile";
import LaborLayout from "@/components/labor/LaborLayout";
import PendingApprovalScreen from "@/components/shared/PendingApprovalScreen";
import ProfessionalAccessPrompt from "@/components/shared/ProfessionalAccessPrompt";
import { motion } from "framer-motion";
import {
  Briefcase,
  CheckCircle2,
  Clock,
  Star,
  TrendingUp,
  CalendarDays,
  Loader2,
} from "lucide-react";

interface Stats {
  pending: number;
  inProgress: number;
  completed: number;
  totalEarnings: number;
  avgRating: number;
  totalReviews: number;
}

interface RecentBooking {
  id: string;
  status: string;
  scheduled_date: string;
  scheduled_time: string | null;
  address: string | null;
  total_amount: number | null;
  notes: string | null;
}

const LaborDashboard = () => {
  const { user, profile, roles, loading: authLoading } = useAuth();
  const { laborProfile, isLoading: laborProfileLoading } = useLaborProfile();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    inProgress: 0,
    completed: 0,
    totalEarnings: 0,
    avgRating: 0,
    totalReviews: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !laborProfile) return;
    const fetchData = async () => {
      const { data: bookings } = await supabase
        .from("service_bookings")
        .select("*")
        .eq("labor_id", user.id)
        .order("created_at", { ascending: false });

      if (bookings) {
        const pending = bookings.filter((b) => b.status === "pending").length;
        const inProgress = bookings.filter((b) => b.status === "in_progress").length;
        const completed = bookings.filter((b) => b.status === "completed");
        const totalEarnings = completed.reduce((sum, b) => sum + (Number(b.total_amount) || 0), 0);
        const rated = completed.filter((b) => b.rating);
        const avgRating = rated.length > 0 ? rated.reduce((sum, b) => sum + (b.rating || 0), 0) / rated.length : 0;
        setStats({ pending, inProgress, completed: completed.length, totalEarnings, avgRating: Math.round(avgRating * 10) / 10, totalReviews: rated.length });
        setRecentBookings(bookings.slice(0, 5));
      }
      setLoading(false);
    };
    fetchData();
  }, [user, laborProfile]);

  // Show loading while auth is resolving
  if (authLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if user has the labor role
  if (laborProfileLoading) return null;

  if (!laborProfile) {
    return (
      <ProfessionalAccessPrompt
        title="No labor enrollment yet"
        message="You haven't submitted your labor onboarding form yet. Would you like to enroll now?"
        actionLabel="Enroll now"
        actionRoute="/labor/onboarding"
      />
    );
  }

  if (laborProfile.approval_status !== "approved") {
    return (
      <PendingApprovalScreen
        title="Account Under Review"
        message="Your labor service account is being verified by our team. Once approved, you'll be able to manage jobs, set availability, and receive bookings. This typically takes 1–2 business days."
      />
    );
  }

  const statCards = [
    { label: "Pending Jobs", value: stats.pending, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "In Progress", value: stats.inProgress, icon: TrendingUp, color: "text-portal-labor", bg: "bg-portal-labor/10" },
    { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Rating", value: stats.avgRating > 0 ? `${stats.avgRating} ★` : "N/A", icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const statusColor: Record<string, string> = {
    pending: "bg-amber-500/15 text-amber-600",
    confirmed: "bg-blue-500/15 text-blue-600",
    in_progress: "bg-portal-labor/15 text-portal-labor",
    completed: "bg-emerald-500/15 text-emerald-600",
    cancelled: "bg-destructive/15 text-destructive",
  };

  return (
    <LaborLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your jobs and performance</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="glass rounded-2xl p-5">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{loading ? "—" : s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass rounded-2xl p-6">
          <h2 className="font-display font-bold text-foreground mb-1">Total Earnings</h2>
          <p className="text-3xl font-display font-bold text-portal-labor">{loading ? "—" : `₹${stats.totalEarnings.toLocaleString()}`}</p>
          <p className="text-xs text-muted-foreground mt-1">From {stats.completed} completed jobs • {stats.totalReviews} reviews</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass rounded-2xl p-6">
          <h2 className="font-display font-bold text-foreground mb-4">Recent Jobs</h2>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : recentBookings.length === 0 ? (
            <div className="text-center py-10">
              <Briefcase className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No jobs yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/50 hover:bg-accent transition-colors">
                  <div className="flex items-center gap-3">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {new Date(b.scheduled_date).toLocaleDateString()}
                        {b.scheduled_time && ` at ${b.scheduled_time}`}
                      </p>
                      {b.address && <p className="text-xs text-muted-foreground">{b.address}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {b.total_amount && <span className="text-sm font-medium text-foreground">₹{Number(b.total_amount).toLocaleString()}</span>}
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColor[b.status] || "bg-muted text-muted-foreground"}`}>
                      {b.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </LaborLayout>
  );
};

export default LaborDashboard;
