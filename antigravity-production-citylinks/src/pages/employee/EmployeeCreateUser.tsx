import { useState } from "react";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Loader2 } from "lucide-react";

const EmployeeCreateUser = () => {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "merchant" as string,
    business_name: "",
    business_type: "retail",
  });

  const set = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.full_name) {
      toast.error("Email, password, and full name are required");
      return;
    }
    if (form.role === "merchant" && !form.business_name) {
      toast.error("Business name is required for merchants");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: form,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`${form.role} account created successfully!`);
      setForm({ email: "", password: "", full_name: "", phone: "", role: "merchant", business_name: "", business_type: "retail" });
    } catch (error: any) {
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <EmployeeLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Create User Account</h1>
          <p className="text-sm text-muted-foreground mt-1">Create pre-approved merchant, labor, or transportation accounts</p>
        </div>

        <Card className="glass p-6">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Account Type *</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="merchant">Merchant</SelectItem>
                  <SelectItem value="labor">Labor / Service Provider</SelectItem>
                  <SelectItem value="transportation">Transportation Provider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div><Label>Full Name *</Label><Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="John Doe" required /></div>
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="9876543210" /></div>
              <div><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="user@example.com" required /></div>
              <div><Label>Password *</Label><Input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Min 6 characters" minLength={6} required /></div>
            </div>

            {form.role === "merchant" && (
              <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/50">
                <div><Label>Business Name *</Label><Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Shop name" required /></div>
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
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Create {form.role.charAt(0).toUpperCase() + form.role.slice(1)} Account
            </Button>
          </form>
        </Card>
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeCreateUser;
