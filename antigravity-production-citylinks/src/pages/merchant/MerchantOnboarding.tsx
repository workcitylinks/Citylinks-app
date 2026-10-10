import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMerchant } from "@/hooks/useMerchant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Store, FileText, Building2, CheckCircle2, ArrowRight, ArrowLeft, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const steps = [
  { title: "Business Details", icon: Store, description: "Tell us about your business" },
  { title: "Tax & Compliance", icon: FileText, description: "GST and PAN details" },
  { title: "Bank Details", icon: Building2, description: "Payment settlement info" },
  { title: "Complete", icon: CheckCircle2, description: "Review and submit" },
];

interface VerifyResult {
  verified: boolean;
  message: string;
  holder_name?: string;
  business_name?: string;
}

const MerchantOnboarding = () => {
  const [step, setStep] = useState(0);
  const { merchant, createMerchant, updateMerchant } = useMerchant();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gstVerify, setGstVerify] = useState<VerifyResult | null>(null);
  const [panVerify, setPanVerify] = useState<VerifyResult | null>(null);
  const [verifyingGst, setVerifyingGst] = useState(false);
  const [verifyingPan, setVerifyingPan] = useState(false);

  useEffect(() => {
    if (!user) navigate("/auth?mode=signup&next=/merchant/onboarding");
  }, [user, navigate]);

  const [form, setForm] = useState({
    business_name: "",
    business_type: "retail",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    district: "",
    taluq: "",
    pincode: "",
    gst_number: "",
    pan_number: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_name: "",
  });

  const set = (key: string, value: string) => {
    setForm((p) => ({ ...p, [key]: value }));
    if (key === "gst_number") setGstVerify(null);
    if (key === "pan_number") setPanVerify(null);
  };

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

  const handleVerifyGst = async () => {
    const num = form.gst_number.toUpperCase().trim();
    if (!num) { toast.error("Enter a GST number first"); return; }
    if (!gstRegex.test(num)) { toast.error("Invalid GST format"); return; }
    setVerifyingGst(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-document", {
        body: { type: "gst", number: num },
      });
      if (error) throw error;
      setGstVerify(data as VerifyResult);
      if (data?.verified) toast.success(data.message);
      else toast.info(data?.message || "GST not verified");
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setVerifyingGst(false);
    }
  };

  const handleVerifyPan = async () => {
    const num = form.pan_number.toUpperCase().trim();
    if (!num) { toast.error("Enter a PAN number first"); return; }
    if (!panRegex.test(num)) { toast.error("Invalid PAN format"); return; }
    setVerifyingPan(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-document", {
        body: { type: "pan", number: num },
      });
      if (error) throw error;
      setPanVerify(data as VerifyResult);
      if (data?.verified) toast.success(data.message);
      else toast.info(data?.message || "PAN not verified");
    } catch (e: any) {
      toast.error(e.message || "Verification failed");
    } finally {
      setVerifyingPan(false);
    }
  };

  const checkDuplicate = async (entityType: string, field: string, value: string): Promise<boolean> => {
    if (!value.trim()) return false;
    try {
      const { data } = await supabase.functions.invoke("check-duplicate", {
        body: { entity_type: entityType, field, value, exclude_user_id: user?.id },
      });
      if (data?.exists) {
        const labels: Record<string, string> = { gst_number: "GST Number", pan_number: "PAN Number", phone: "Phone number", email: "Email", bank_account_number: "Bank Account" };
        toast.error(`This ${labels[field] || field} is already registered with another account.`);
        return true;
      }
    } catch { /* ignore check failures */ }
    return false;
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!form.business_name.trim()) { toast.error("Business name is required"); return; }
      if (form.phone && await checkDuplicate("merchant", "phone", form.phone)) return;
      if (form.email && await checkDuplicate("merchant", "email", form.email)) return;
      if (!merchant) {
        await createMerchant.mutateAsync({
          business_name: form.business_name,
          business_type: form.business_type,
          phone: form.phone,
          email: form.email,
        });
      } else {
        await updateMerchant.mutateAsync({
          business_name: form.business_name,
          business_type: form.business_type,
          phone: form.phone,
          email: form.email,
          address: form.address,
          city: form.city,
          state: form.state,
          district: form.district,
          taluq: form.taluq,
          pincode: form.pincode,
          onboarding_step: 2,
        });
      }
    }
    if (step === 1) {
      if (form.pan_number && !panRegex.test(form.pan_number.toUpperCase())) {
        toast.error("Invalid PAN format (e.g., ABCDE1234F)");
        return;
      }
      if (form.gst_number && !gstRegex.test(form.gst_number.toUpperCase())) {
        toast.error("Invalid GST format");
        return;
      }
      if (form.gst_number && await checkDuplicate("merchant", "gst_number", form.gst_number)) return;
      if (form.pan_number && await checkDuplicate("merchant", "pan_number", form.pan_number)) return;
      await updateMerchant.mutateAsync({
        gst_number: form.gst_number.toUpperCase(),
        pan_number: form.pan_number.toUpperCase(),
        onboarding_step: 3,
      });
    }
    if (step === 2) {
      if (form.bank_account_number && await checkDuplicate("merchant", "bank_account_number", form.bank_account_number)) return;
      await updateMerchant.mutateAsync({
        bank_account_number: form.bank_account_number,
        bank_ifsc: form.bank_ifsc.toUpperCase(),
        bank_name: form.bank_name,
        onboarding_step: 4,
      });
    }
    if (step === 3) {
      await updateMerchant.mutateAsync({
        onboarding_complete: true,
        onboarding_step: 4,
      });
      try {
        const { data: verifyResult } = await supabase.functions.invoke("auto-verify", {
          body: { entity_type: "merchant", entity_id: merchant?.id },
        });
        if (verifyResult?.auto_approved) {
          toast.success("🎉 Your application was auto-approved! All documents verified.");
        } else {
          toast.success(`Onboarding complete! Sent for manual review. ${verifyResult?.failures?.join(", ") || ""}`);
        }
      } catch {
        toast.success("Onboarding complete! Your application is pending approval.");
      }
      navigate("/merchant");
      return;
    }
    setStep((s) => s + 1);
  };

  const VerifyBadge = ({ result }: { result: VerifyResult | null }) => {
    if (!result) return null;
    return result.verified ? (
      <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-200 gap-1 mt-1">
        <ShieldCheck className="w-3 h-3" /> Verified — {result.holder_name || result.business_name}
      </Badge>
    ) : (
      <Badge className="bg-amber-500/15 text-amber-700 border-amber-200 gap-1 mt-1">
        <XCircle className="w-3 h-3" /> {result.message}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold text-foreground">SimpleBiller Onboarding</h1>
          <p className="text-muted-foreground mt-1">Set up your business in a few steps</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i <= step
                    ? "bg-portal-merchant text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 ${i < step ? "bg-portal-merchant" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <Card className="glass-strong p-6 space-y-5">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">{steps[step].title}</h2>
            <p className="text-sm text-muted-foreground">{steps[step].description}</p>
          </div>

          {step === 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Business Name *</Label>
                <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Your shop name" maxLength={100} />
              </div>
              <div>
                <Label>Business Type</Label>
                <Select value={form.business_type} onValueChange={(v) => set("business_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="restaurant">Restaurant</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" maxLength={15} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="shop@example.com" maxLength={255} />
              </div>
              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" maxLength={200} />
              </div>
              <div>
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} maxLength={50} />
              </div>
              <div>
                <Label>State</Label>
                <Input value={form.state} onChange={(e) => set("state", e.target.value)} maxLength={50} />
              </div>
              <div>
                <Label>District</Label>
                <Input value={form.district} onChange={(e) => set("district", e.target.value)} maxLength={50} />
              </div>
              <div>
                <Label>Taluq</Label>
                <Input value={form.taluq} onChange={(e) => set("taluq", e.target.value)} maxLength={50} />
              </div>
              <div>
                <Label>Pincode</Label>
                <Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} maxLength={6} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <div className="glass rounded-xl p-4 space-y-3">
                <Label className="text-foreground font-medium">GST Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.gst_number}
                    onChange={(e) => set("gst_number", e.target.value)}
                    placeholder="22AAAAA0000A1Z5"
                    maxLength={15}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyGst}
                    disabled={verifyingGst || !form.gst_number.trim()}
                    className="gap-1.5 shrink-0"
                  >
                    {verifyingGst ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Verify
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  15-character GST identification number.
                  <span className="text-foreground/60 ml-1">Test: 22AAAAA0000A1Z5</span>
                </p>
                <VerifyBadge result={gstVerify} />
              </div>

              <div className="glass rounded-xl p-4 space-y-3">
                <Label className="text-foreground font-medium">PAN Number</Label>
                <div className="flex gap-2">
                  <Input
                    value={form.pan_number}
                    onChange={(e) => set("pan_number", e.target.value)}
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleVerifyPan}
                    disabled={verifyingPan || !form.pan_number.trim()}
                    className="gap-1.5 shrink-0"
                  >
                    {verifyingPan ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    Verify
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  10-character PAN card number.
                  <span className="text-foreground/60 ml-1">Test: ABCDE1234F</span>
                </p>
                <VerifyBadge result={panVerify} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Bank Name</Label>
                <Input value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} maxLength={100} />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input value={form.bank_account_number} onChange={(e) => set("bank_account_number", e.target.value)} maxLength={20} />
              </div>
              <div>
                <Label>IFSC Code</Label>
                <Input value={form.bank_ifsc} onChange={(e) => set("bank_ifsc", e.target.value)} placeholder="SBIN0001234" maxLength={11} />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Your application will be reviewed by our team. You'll be notified once approved.
                Meanwhile, you can explore the dashboard.
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="p-3 rounded-xl bg-accent/50">
                  <span className="text-muted-foreground">Business</span>
                  <p className="font-medium text-foreground">{form.business_name || "—"}</p>
                </div>
                <div className="p-3 rounded-xl bg-accent/50">
                  <span className="text-muted-foreground">Type</span>
                  <p className="font-medium text-foreground capitalize">{form.business_type}</p>
                </div>
                <div className="p-3 rounded-xl bg-accent/50">
                  <span className="text-muted-foreground">GST</span>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{form.gst_number || "Not provided"}</p>
                    {gstVerify?.verified && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-accent/50">
                  <span className="text-muted-foreground">PAN</span>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{form.pan_number || "Not provided"}</p>
                    {panVerify?.verified && <ShieldCheck className="w-4 h-4 text-emerald-600" />}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="ghost" onClick={() => step === 0 ? navigate("/") : setStep((s) => s - 1)}>
              <ArrowLeft className="w-4 h-4 mr-1" /> {step === 0 ? "Back to Home" : "Back"}
            </Button>
            <Button
              onClick={handleNext}
              disabled={createMerchant.isPending || updateMerchant.isPending}
              className="bg-portal-merchant hover:bg-portal-merchant/90 text-primary-foreground"
            >
              {step === 3 ? "Submit Application" : "Continue"} <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MerchantOnboarding;
