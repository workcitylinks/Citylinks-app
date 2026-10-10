import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wrench, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLaborProfile } from "@/hooks/useLaborProfile";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LaborOnboarding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { laborProfile, isLoading, createLaborProfile } = useLaborProfile();
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", pan_number: "", labor_id_number: "", bank_account_number: "" });

  useEffect(() => {
    if (!user) navigate("/auth?mode=signup&next=/labor/onboarding");
    if (!isLoading && laborProfile) navigate("/labor");
  }, [user, isLoading, laborProfile, navigate]);

  const set = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const checkDuplicate = async (field: string, value: string): Promise<boolean> => {
    if (!value.trim()) return false;
    try {
      const { data } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke("check-duplicate", {
        body: { entity_type: "labor", field, value, exclude_user_id: user?.id },
      });
      if (data?.exists) {
        const labels: Record<string, string> = { pan_number: "PAN Number", labor_id_number: "Labor ID", bank_account_number: "Bank Account", phone: "Phone", email: "Email" };
        toast.error(`This ${labels[field] || field} is already registered.`);
        return true;
      }
    } catch { /* ignore */ }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim()) return toast.error("Full name is required");
    if (form.pan_number && await checkDuplicate("pan_number", form.pan_number)) return;
    if (form.labor_id_number && await checkDuplicate("labor_id_number", form.labor_id_number)) return;
    if (form.bank_account_number && await checkDuplicate("bank_account_number", form.bank_account_number)) return;
    if (form.phone && await checkDuplicate("phone", form.phone)) return;
    const result = await createLaborProfile.mutateAsync({ ...form, pan_number: form.pan_number.toUpperCase(), labor_id_number: form.labor_id_number.toUpperCase() });
    try {
      const { data: verifyResult } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke("auto-verify", {
        body: { entity_type: "labor", entity_id: result.id },
      });
      if (verifyResult?.auto_approved) {
        toast.success("🎉 Auto-approved! All documents verified.");
      } else {
        toast.success(`Enrollment submitted! Sent for manual review. ${verifyResult?.failures?.join(", ") || ""}`);
      }
    } catch {
      toast.success("Enrollment submitted! Your application is pending approval.");
    }
    navigate("/labor");
  };

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-portal-labor/15 flex items-center justify-center mx-auto mb-4">
            <Wrench className="w-7 h-7 text-portal-labor" />
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Labor Enrollment</h1>
          <p className="text-muted-foreground mt-1">Register as a verified service provider</p>
        </div>

        <Card className="glass-strong p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Your full name" maxLength={100} required /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" maxLength={15} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" maxLength={255} /></div>
            <div><Label>PAN Number *</Label><Input value={form.pan_number} onChange={(e) => set("pan_number", e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} required /></div>
            <div><Label>Labor ID *</Label><Input value={form.labor_id_number} onChange={(e) => set("labor_id_number", e.target.value.toUpperCase())} placeholder="Registered labor ID" maxLength={30} required /></div>
            <div><Label>Account Number *</Label><Input value={form.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} placeholder="Bank account for money transfer" maxLength={34} required /></div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" type="button" onClick={() => navigate("/")}><ArrowLeft className="w-4 h-4 mr-1" /> Back</Button>
              <Button type="submit" disabled={createLaborProfile.isPending} className="bg-portal-labor hover:bg-portal-labor/90 text-primary-foreground">Enroll <ArrowRight className="w-4 h-4 ml-1" /></Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LaborOnboarding;