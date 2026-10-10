import { useState, useEffect } from "react";
import { useMerchant } from "@/hooks/useMerchant";
import { useAuth } from "@/contexts/AuthContext";
import MerchantLayout from "@/components/merchant/MerchantLayout";
import SensitiveData from "@/components/ui/SensitiveData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Store, Save } from "lucide-react";

const MerchantProfile = () => {
  const { merchant, updateMerchant } = useMerchant();
  const { profile, roles } = useAuth();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ business_name: "", phone: "", email: "", address: "" });

  useEffect(() => {
    if (merchant) {
      setForm({
        business_name: merchant.business_name || "",
        phone: merchant.phone || "",
        email: merchant.email || "",
        address: merchant.address || "",
      });
    }
  }, [merchant]);

  const handleSave = async () => {
    await updateMerchant.mutateAsync(form);
    setEditing(false);
  };

  if (!merchant) return null;

  return (
    <MerchantLayout>
      <div className="space-y-6 max-w-2xl">
        <h1 className="font-display text-2xl font-bold text-foreground">Business Profile</h1>

        <Card className="glass p-5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-portal-merchant/15 flex items-center justify-center">
              <Store className="w-6 h-6 text-portal-merchant" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground">{merchant.business_name}</h2>
              <p className="text-sm text-muted-foreground capitalize">{merchant.business_type}</p>
            </div>
            <Badge className="ml-auto capitalize">{merchant.approval_status}</Badge>
          </div>

          {editing ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>Business Name</Label>
                <Input value={form.business_name} onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))} maxLength={100} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} maxLength={15} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} maxLength={255} />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} maxLength={200} />
              </div>
              <div className="sm:col-span-2 flex gap-2">
                <Button onClick={handleSave} disabled={updateMerchant.isPending} className="bg-portal-merchant hover:bg-portal-merchant/90 text-primary-foreground">
                  <Save className="w-4 h-4 mr-1" /> Save
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div><span className="text-muted-foreground">Phone</span><p className="text-foreground">{merchant.phone || "—"}</p></div>
              <div><span className="text-muted-foreground">Email</span><p className="text-foreground">{merchant.email || "—"}</p></div>
              <div className="sm:col-span-2"><span className="text-muted-foreground">Address</span><p className="text-foreground">{merchant.address || "—"}</p></div>
              <Button variant="outline" onClick={() => setEditing(true)} className="w-fit">Edit Details</Button>
            </div>
          )}
        </Card>

        <Card className="glass p-5 space-y-3">
          <h2 className="font-display font-bold text-foreground">Compliance Details</h2>
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <span className="text-muted-foreground">GST Number</span>
              <div><SensitiveData value={merchant.gst_number || ""} /></div>
            </div>
            <div>
              <span className="text-muted-foreground">PAN Number</span>
              <div><SensitiveData value={merchant.pan_number || ""} /></div>
            </div>
            <div>
              <span className="text-muted-foreground">Bank</span>
              <p className="text-foreground">{merchant.bank_name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Account Number</span>
              <div><SensitiveData value={merchant.bank_account_number || ""} /></div>
            </div>
          </div>
        </Card>

        <Card className="glass p-5 space-y-2">
          <h2 className="font-display font-bold text-foreground">Account</h2>
          <div className="text-sm space-y-1">
            <p className="text-muted-foreground">Name: <span className="text-foreground">{profile?.full_name || "—"}</span></p>
            <p className="text-muted-foreground">Roles: <span className="text-foreground">{roles.join(", ") || "—"}</span></p>
          </div>
        </Card>
      </div>
    </MerchantLayout>
  );
};

export default MerchantProfile;
