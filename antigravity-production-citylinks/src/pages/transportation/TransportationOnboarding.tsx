import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTransporter } from "@/hooks/useTransporter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Truck, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useEffect } from "react";

const TransportationOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createTransporter, transporter, isLoading } = useTransporter();
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", vehicle_number: "", pan_number: "", dl_number: "", business_permit_number: "", bank_account_number: "" });

  useEffect(() => {
    if (!user) navigate("/auth?mode=signup&next=/transportation/onboarding");
    if (!isLoading && transporter) navigate("/transportation");
  }, [user, transporter, isLoading, navigate]);

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const checkDuplicate = async (field: string, value: string): Promise<boolean> => {
    if (!value.trim()) return false;
    try {
      const { data } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke("check-duplicate", {
        body: { entity_type: "transporter", field, value, exclude_user_id: user?.id },
      });
      if (data?.exists) {
        const labels: Record<string, string> = { pan_number: "PAN", vehicle_number: "Vehicle Number", dl_number: "DL Number", bank_account_number: "Bank Account", business_permit_number: "Business Permit" };
        toast.error(`This ${labels[field] || field} is already registered.`);
        return true;
      }
    } catch { /* ignore */ }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) { toast.error("Full name is required"); return; }
    if (form.pan_number && await checkDuplicate("pan_number", form.pan_number)) return;
    if (form.vehicle_number && await checkDuplicate("vehicle_number", form.vehicle_number)) return;
    if (form.dl_number && await checkDuplicate("dl_number", form.dl_number)) return;
    if (form.bank_account_number && await checkDuplicate("bank_account_number", form.bank_account_number)) return;
    const result = await createTransporter.mutateAsync(form) as any;
    try {
      const { data: verifyResult } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke("auto-verify", {
        body: { entity_type: "transporter", entity_id: result?.id },
      });
      if (verifyResult?.auto_approved) {
        toast.success("🎉 Auto-approved! All documents verified.");
      } else {
        toast.success(`Registration submitted! Sent for manual review. ${verifyResult?.failures?.join(", ") || ""}`);
      }
    } catch {
      toast.success("Registration submitted! Your application is pending approval.");
    }
    navigate("/transportation");
  };

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-portal-transportation/15 flex items-center justify-center mx-auto mb-4">
            <Truck className="w-7 h-7 text-portal-transportation" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Transport Hub Registration</h1>
          <p className="text-muted-foreground mt-1">Register as a transportation provider</p>
        </div>

        <Card className="glass-strong p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Full Name *</Label>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Your full name" maxLength={100} required />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" maxLength={15} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" maxLength={255} />
            </div>
            <div>
              <Label>Vehicle Number *</Label>
              <Input value={form.vehicle_number} onChange={(e) => set("vehicle_number", e.target.value.toUpperCase())} placeholder="KA01AB1234" maxLength={20} required />
            </div>
            <div>
              <Label>PAN Number *</Label>
              <Input value={form.pan_number} onChange={(e) => set("pan_number", e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} required />
            </div>
            <div>
              <Label>DL Number *</Label>
              <Input value={form.dl_number} onChange={(e) => set("dl_number", e.target.value.toUpperCase())} placeholder="Driving licence number" maxLength={30} required />
            </div>
            <div>
              <Label>Business Permit *</Label>
              <Input value={form.business_permit_number} onChange={(e) => set("business_permit_number", e.target.value.toUpperCase())} placeholder="Permit number" maxLength={40} required />
            </div>
            <div>
              <Label>Account Number *</Label>
              <Input value={form.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} placeholder="Bank account for transfer" maxLength={34} required />
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="ghost" type="button" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <Button type="submit" disabled={createTransporter.isPending} className="bg-portal-transportation hover:bg-portal-transportation/90 text-primary-foreground">
                Register <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default TransportationOnboarding;
