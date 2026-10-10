import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import LaborLayout from "@/components/labor/LaborLayout";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Wrench, X } from "lucide-react";

interface Service {
  id: string;
  service_name: string;
  description: string | null;
  category: string;
  hourly_rate: number | null;
  is_active: boolean;
}

const LaborServices = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [rate, setRate] = useState("");
  const [active, setActive] = useState(true);

  const fetchServices = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("labor_services")
      .select("*")
      .eq("labor_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setServices(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchServices();
  }, [user]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("general");
    setRate("");
    setActive(true);
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setName(s.service_name);
    setDescription(s.description || "");
    setCategory(s.category);
    setRate(s.hourly_rate?.toString() || "");
    setActive(s.is_active);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) return;
    const payload = {
      labor_id: user.id,
      service_name: name.trim(),
      description: description.trim() || null,
      category: category.trim(),
      hourly_rate: rate ? parseFloat(rate) : null,
      is_active: active,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (editing) {
      ({ error } = await supabase
        .from("labor_services")
        .update(payload)
        .eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("labor_services").insert(payload));
    }

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editing ? "Updated" : "Created" });
      resetForm();
      fetchServices();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("labor_services").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deleted" });
      fetchServices();
    }
  };

  const toggleActive = async (s: Service) => {
    await supabase
      .from("labor_services")
      .update({ is_active: !s.is_active, updated_at: new Date().toISOString() })
      .eq("id", s.id);
    fetchServices();
  };

  return (
    <LaborLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              My Services
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage the services you offer
            </p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-portal-labor text-primary-foreground hover:bg-portal-labor/90"
          >
            <Plus className="w-4 h-4 mr-1" /> Add Service
          </Button>
        </div>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="glass rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-display font-bold text-foreground">
                    {editing ? "Edit Service" : "New Service"}
                  </h2>
                  <button onClick={resetForm}>
                    <X className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Service Name *
                    </label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Plumbing, Electrical Repair"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Category
                    </label>
                    <Input
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g., plumbing, electrical"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Hourly Rate (₹)
                    </label>
                    <Input
                      type="number"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="500"
                    />
                  </div>
                  <div className="flex items-center gap-3 pt-5">
                    <Switch checked={active} onCheckedChange={setActive} />
                    <span className="text-sm text-foreground">
                      {active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">
                    Description
                  </label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your service..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleSave}
                  className="bg-portal-labor text-primary-foreground hover:bg-portal-labor/90"
                >
                  {editing ? "Update" : "Create"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Services list */}
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : services.length === 0 ? (
          <div className="text-center py-16">
            <Wrench className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              No services added yet. Click "Add Service" to get started.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((s, i) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`glass rounded-2xl p-5 space-y-3 transition-opacity ${
                  !s.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-display font-bold text-foreground">
                      {s.service_name}
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-portal-labor/10 text-portal-labor">
                      {s.category}
                    </span>
                  </div>
                  <Switch
                    checked={s.is_active}
                    onCheckedChange={() => toggleActive(s)}
                  />
                </div>
                {s.description && (
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                )}
                {s.hourly_rate && (
                  <p className="text-lg font-display font-bold text-foreground">
                    ₹{Number(s.hourly_rate).toLocaleString()}/hr
                  </p>
                )}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                    <Pencil className="w-3 h-3 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(s.id)}
                    className="text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3 mr-1" /> Delete
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </LaborLayout>
  );
};

export default LaborServices;
