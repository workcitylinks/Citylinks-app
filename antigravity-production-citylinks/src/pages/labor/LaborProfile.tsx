import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LaborLayout from "@/components/labor/LaborLayout";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { User, Phone, Mail, Shield } from "lucide-react";

const LaborProfile = () => {
  const { user, profile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setPhone(profile.phone || "");
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
    }
    setSaving(false);
  };

  return (
    <LaborLayout>
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Profile
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your account details
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 space-y-5"
        >
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-portal-labor/15 flex items-center justify-center">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="avatar"
                  className="w-16 h-16 rounded-2xl object-cover"
                />
              ) : (
                <User className="w-8 h-8 text-portal-labor" />
              )}
            </div>
            <div>
              <p className="font-display font-bold text-foreground">
                {profile?.full_name || "Service Provider"}
              </p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <User className="w-3 h-3" /> Full Name
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Phone className="w-3 h-3" /> Phone
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <Input value={user?.email || ""} disabled />
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-portal-labor text-primary-foreground hover:bg-portal-labor/90"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </motion.div>

        {/* Role badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-5 flex items-center gap-3"
        >
          <Shield className="w-5 h-5 text-portal-labor" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Labor / Service Provider
            </p>
            <p className="text-xs text-muted-foreground">
              Your service ranking improves with completed jobs and positive reviews
            </p>
          </div>
        </motion.div>
      </div>
    </LaborLayout>
  );
};

export default LaborProfile;
