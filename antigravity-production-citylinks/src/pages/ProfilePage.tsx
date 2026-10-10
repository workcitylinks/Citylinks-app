import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";
import SensitiveData from "@/components/ui/SensitiveData";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Camera, Save, X, User, CreditCard, MapPin, Shield, Loader2 } from "lucide-react";

const ProfilePage = () => {
  const { user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
    aadhaar_number: "",
    pan_number: "",
    address: "",
    avatar_url: "",
  });

  // Fetch extended profile data
  const [extendedProfile, setExtendedProfile] = useState<any>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    if (data) {
      setExtendedProfile(data);
      setForm({
        first_name: (data as any).first_name || "",
        last_name: (data as any).last_name || "",
        phone: data.phone || "",
        aadhaar_number: (data as any).aadhaar_number || "",
        pan_number: (data as any).pan_number || "",
        address: (data as any).address || "",
        avatar_url: data.avatar_url || "",
      });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Upload failed: " + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();

    await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);
    setForm((f) => ({ ...f, avatar_url: avatarUrl }));
    setUploading(false);
    toast.success("Photo updated!");
    fetchProfile();
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: form.first_name.trim() || null,
        last_name: form.last_name.trim() || null,
        full_name: [form.first_name.trim(), form.last_name.trim()].filter(Boolean).join(" ") || null,
        phone: form.phone.trim() || null,
        aadhaar_number: form.aadhaar_number.trim() || null,
        pan_number: form.pan_number.trim() || null,
        address: form.address.trim() || null,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", user.id);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Profile saved!");
      setEditing(false);
      fetchProfile();
    }
    setSaving(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = [form.first_name, form.last_name]
    .map((n) => n?.charAt(0)?.toUpperCase())
    .filter(Boolean)
    .join("") || user?.email?.charAt(0)?.toUpperCase() || "U";

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
            My Profile
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Manage your personal information
          </p>
        </motion.div>

        {/* Avatar section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass rounded-2xl p-6 mb-5 flex items-center gap-5"
        >
          <div className="relative group">
            <Avatar className="w-20 h-20 ring-2 ring-border">
              <AvatarImage src={form.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 flex items-center justify-center bg-foreground/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 text-primary-foreground animate-spin" />
              ) : (
                <Camera className="w-5 h-5 text-primary-foreground" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          <div>
            <p className="font-display font-bold text-lg text-foreground">
              {[form.first_name, form.last_name].filter(Boolean).join(" ") || "Your Name"}
            </p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </motion.div>

        {/* Personal info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-6 mb-5 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <h2 className="font-display font-bold text-foreground">Personal Details</h2>
            </div>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); fetchProfile(); }}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
          </div>

          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>First Name</Label>
                <Input
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                  placeholder="First name"
                  maxLength={50}
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                  placeholder="Last name"
                  maxLength={50}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 9876543210"
                  maxLength={15}
                />
              </div>
              <div className="sm:col-span-2">
                <Label>Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Your full address"
                  maxLength={300}
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">First Name</span>
                <p className="text-foreground font-medium">{form.first_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Last Name</span>
                <p className="text-foreground font-medium">{form.last_name || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Phone</span>
                <p className="text-foreground font-medium">{form.phone || "—"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="text-foreground font-medium">{user?.email || "—"}</p>
              </div>
              <div className="sm:col-span-2">
                <span className="text-muted-foreground">Address</span>
                <p className="text-foreground font-medium">{form.address || "—"}</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Identity documents */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-6 mb-5 space-y-5"
        >
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h2 className="font-display font-bold text-foreground">Identity Documents</h2>
          </div>

          {editing ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Aadhaar Number</Label>
                <Input
                  value={form.aadhaar_number}
                  onChange={(e) => setForm((f) => ({ ...f, aadhaar_number: e.target.value.replace(/[^0-9 ]/g, "") }))}
                  placeholder="XXXX XXXX XXXX"
                  maxLength={14}
                />
              </div>
              <div>
                <Label>PAN Number</Label>
                <Input
                  value={form.pan_number}
                  onChange={(e) => setForm((f) => ({ ...f, pan_number: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "") }))}
                  placeholder="ABCDE1234F"
                  maxLength={10}
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">Aadhaar Number</span>
                <div><SensitiveData value={form.aadhaar_number} visibleChars={4} /></div>
              </div>
              <div>
                <span className="text-muted-foreground">PAN Number</span>
                <div><SensitiveData value={form.pan_number} visibleChars={4} /></div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Save button */}
        {editing && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full h-12 gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </motion.div>
        )}

        {/* Security note */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-2xl p-4 mt-5 flex items-start gap-3"
        >
          <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">Your data is secure</p>
            <p className="text-xs text-muted-foreground">
              Sensitive information like Aadhaar and PAN are masked by default and stored securely.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;
