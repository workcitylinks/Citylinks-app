import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTransporter } from "@/hooks/useTransporter";
import { useAuth } from "@/contexts/AuthContext";
import TransportationLayout from "@/components/transportation/TransportationLayout";
import PendingApprovalScreen from "@/components/shared/PendingApprovalScreen";
import ProfessionalAccessPrompt from "@/components/shared/ProfessionalAccessPrompt";
import { Card } from "@/components/ui/card";
import { Truck, MapPin, IndianRupee, Star } from "lucide-react";

const TransportationDashboard = () => {
  const { transporter, isLoading } = useTransporter();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
  }, [isLoading, transporter, user, navigate]);

  if (isLoading) return null;

  if (!transporter) {
    return (
      <ProfessionalAccessPrompt
        title="No transport enrollment yet"
        message="You haven't submitted your transport onboarding form yet. Would you like to enroll now?"
        actionLabel="Enroll now"
        actionRoute="/transportation/onboarding"
      />
    );
  }

  if (transporter.approval_status !== "approved") {
    return (
      <PendingApprovalScreen
        title="Registration Under Review"
        message="Your transportation service registration is being verified by our team. Once approved, you'll be able to accept ride requests, manage your fleet, and start earning. This typically takes 1–2 business days."
      />
    );
  }

  const cards = [
    { label: "Active Vehicles", value: "0", icon: Truck, accent: "text-portal-transportation" },
    { label: "Today's Rides", value: "0", icon: MapPin, accent: "text-portal-customer" },
    { label: "Total Earnings", value: "₹0", icon: IndianRupee, accent: "text-portal-merchant" },
    { label: "Rating", value: "N/A", icon: Star, accent: "text-amber-500" },
  ];

  return (
    <TransportationLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">{transporter.full_name}</h1>
          <p className="text-sm text-muted-foreground">Transportation Dashboard</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <Card key={c.label} className="glass p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{c.label}</span>
                <c.icon className={`w-5 h-5 ${c.accent}`} />
              </div>
              <p className="text-2xl font-display font-bold text-foreground">{c.value}</p>
            </Card>
          ))}
        </div>
      </div>
    </TransportationLayout>
  );
};

export default TransportationDashboard;
