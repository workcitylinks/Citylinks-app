import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransporter } from "@/hooks/useTransporter";
import TransportationLayout from "@/components/transportation/TransportationLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const TransportationProfile = () => {
  const { user } = useAuth();
  const { transporter, updateTransporter } = useTransporter();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", phone: "", email: "", address: "", city: "", district: "", state: "" });

  useEffect(() => {
    if (!user) navigate("/auth");
    if (transporter) {
      setForm({
        full_name: transporter.full_name || "",
        phone: transporter.phone || "",
        email: transporter.email || "",
        address: transporter.address || "",
        city: transporter.city || "",
        district: transporter.district || "",
        state: transporter.state || "",
      });
    }
  }, [transporter]);

  const handleSave = async () => {
    await updateTransporter.mutateAsync(form);
    toast.success("Profile updated!");
  };

  if (!transporter) return null;

  return (
    <TransportationLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground">Transport Profile</h1>
        <Card className="glass p-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Full Name</Label><Input value={form.full_name} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} /></div>
            <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>City</Label><Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} /></div>
            <div><Label>District</Label><Input value={form.district} onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))} /></div>
            <div><Label>State</Label><Input value={form.state} onChange={(e) => setForm((p) => ({ ...p, state: e.target.value }))} /></div>
          </div>
          <Button onClick={handleSave} disabled={updateTransporter.isPending} className="bg-portal-transportation hover:bg-portal-transportation/90">
            Save Changes
          </Button>
        </Card>
      </div>
    </TransportationLayout>
  );
};

export default TransportationProfile;
