import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import PendingApprovalScreen from "@/components/shared/PendingApprovalScreen";
import ProfessionalAccessPrompt from "@/components/shared/ProfessionalAccessPrompt";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import MerchantLayout from "@/components/merchant/MerchantLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShoppingCart, Package, IndianRupee, TrendingUp, Clock, Megaphone } from "lucide-react";
import { toast } from "sonner";

const MerchantDashboard = () => {
  const { merchant, isLoading } = useMerchant();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showAdDialog, setShowAdDialog] = useState(false);
  const [submittingAd, setSubmittingAd] = useState(false);
  const [adForm, setAdForm] = useState({ title: "", description: "" });

  const { data: stats } = useQuery({
    queryKey: ["merchant-stats", merchant?.id],
    queryFn: async () => {
      if (!merchant) return null;
      const today = new Date().toISOString().split("T")[0];
      const [billsRes, productsRes, todayBillsRes] = await Promise.all([
        supabase.from("bills").select("total_amount").eq("merchant_id", merchant.id),
        supabase.from("merchant_products").select("id").eq("merchant_id", merchant.id),
        supabase.from("bills").select("total_amount").eq("merchant_id", merchant.id).gte("created_at", today),
      ]);
      const totalRevenue = (billsRes.data || []).reduce((s, b) => s + Number(b.total_amount || 0), 0);
      const todayRevenue = (todayBillsRes.data || []).reduce((s, b) => s + Number(b.total_amount || 0), 0);
      return {
        totalBills: billsRes.data?.length || 0,
        totalProducts: productsRes.data?.length || 0,
        totalRevenue,
        todayRevenue,
        todayBills: todayBillsRes.data?.length || 0,
      };
    },
    enabled: !!merchant && merchant.approval_status === "approved",
  });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
  }, [isLoading, merchant, user, navigate]);

  if (isLoading) return null;

  if (!merchant) {
    return (
      <ProfessionalAccessPrompt
        title="No merchant enrollment yet"
        message="You haven't submitted your merchant onboarding form yet. Would you like to enroll now?"
        actionLabel="Enroll now"
        actionRoute="/merchant/onboarding"
      />
    );
  }

  if (merchant.approval_status !== "approved") {
    return (
      <PendingApprovalScreen
        title="Business Verification in Progress"
        message="Your business application is currently under review by our verification team. Once approved, you'll have full access to the SimpleBiller dashboard, billing terminal, and inventory management. This typically takes 1–2 business days."
      />
    );
  }

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-700",
    approved: "bg-portal-merchant/15 text-portal-merchant",
    rejected: "bg-destructive/15 text-destructive",
  };

  const cards = [
    { label: "Today's Revenue", value: `₹${stats?.todayRevenue?.toLocaleString() || 0}`, icon: IndianRupee, accent: "text-portal-merchant" },
    { label: "Today's Bills", value: stats?.todayBills || 0, icon: ShoppingCart, accent: "text-portal-customer" },
    { label: "Total Revenue", value: `₹${stats?.totalRevenue?.toLocaleString() || 0}`, icon: TrendingUp, accent: "text-portal-employee" },
    { label: "Products", value: stats?.totalProducts || 0, icon: Package, accent: "text-portal-labor" },
  ];

  const handleAdRequestSubmit = async () => {
    if (!user || !merchant) return;
    if (!adForm.title.trim()) {
      toast.error("Ad title is required");
      return;
    }

    setSubmittingAd(true);
    try {
      const { error } = await supabase.from("ads").insert({
        created_by: user.id,
        title: adForm.title.trim(),
        description: adForm.description.trim() || null,
        link_url: `/shop/${merchant.id}`,
        category: "merchant",
        is_active: false,
        priority: 0,
      });

      if (error) throw error;

      toast.success("Ad request submitted. It will go live after payment confirmation and review.");
      setAdForm({ title: "", description: "" });
      setShowAdDialog(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to submit ad request");
    } finally {
      setSubmittingAd(false);
    }
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">{merchant.business_name}</h1>
            <p className="text-sm text-muted-foreground capitalize">{merchant.business_type}</p>
          </div>
          <Badge className={statusColor[merchant.approval_status] || ""}>
            <Clock className="w-3 h-3 mr-1" />
            {merchant.approval_status}
          </Badge>
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

        <Card className="glass p-5 space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
                <Megaphone className="w-5 h-5 text-primary" /> Promote your shop
              </h2>
              <p className="text-sm text-muted-foreground">
                Submit a featured ad request for your shop. It will be activated after payment confirmation and review.
              </p>
            </div>
            <Button onClick={() => setShowAdDialog(true)} className="gap-2">
              <Megaphone className="w-4 h-4" /> Request Featured Ad
            </Button>
          </div>
        </Card>
      </div>

      <Dialog open={showAdDialog} onOpenChange={setShowAdDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a featured ad</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Input
                value={adForm.title}
                onChange={(event) => setAdForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Ad title"
                maxLength={100}
              />
            </div>
            <div>
              <Textarea
                value={adForm.description}
                onChange={(event) => setAdForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Short message for customers"
                maxLength={300}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAdDialog(false)}>Cancel</Button>
            <Button onClick={handleAdRequestSubmit} disabled={submittingAd}>
              {submittingAd ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MerchantLayout>
  );
};

export default MerchantDashboard;
