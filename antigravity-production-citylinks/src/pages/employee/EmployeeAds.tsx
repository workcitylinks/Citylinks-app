import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Megaphone, Trash2, Edit, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const EmployeeAds = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [form, setForm] = useState({ title: "", description: "", image_url: "", link_url: "", category: "general", priority: 0 });

  const { data: ads, isLoading } = useQuery({
    queryKey: ["employee-ads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ads" as any)
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const createAd = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase
        .from("ads" as any)
        .insert({ ...values, created_by: user?.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-ads"] });
      toast.success("Ad created!");
      setShowCreate(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateAd = useMutation({
    mutationFn: async ({ id, ...values }: any) => {
      const { error } = await supabase
        .from("ads" as any)
        .update(values)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-ads"] });
      toast.success("Ad updated!");
      setEditingAd(null);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteAd = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ads" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-ads"] });
      toast.success("Ad deleted!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("ads" as any).update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employee-ads"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const resetForm = () => setForm({ title: "", description: "", image_url: "", link_url: "", category: "general", priority: 0 });

  const handleSubmit = () => {
    if (!form.title.trim()) return toast.error("Title is required");
    if (editingAd) {
      updateAd.mutate({ id: editingAd.id, ...form });
    } else {
      createAd.mutate(form);
    }
  };

  const openEdit = (ad: any) => {
    setEditingAd(ad);
    setForm({ title: ad.title, description: ad.description || "", image_url: ad.image_url || "", link_url: ad.link_url || "", category: ad.category, priority: ad.priority });
    setShowCreate(true);
  };

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Megaphone className="w-6 h-6 text-primary" /> Ads & Promotions
            </h1>
            <p className="text-sm text-muted-foreground">Manage featured tiles shown to customers</p>
          </div>
          <Button onClick={() => { resetForm(); setEditingAd(null); setShowCreate(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Create Ad
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-32 rounded-2xl bg-muted animate-pulse" />)}
          </div>
        ) : !ads || ads.length === 0 ? (
          <Card className="p-12 text-center">
            <Megaphone className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">No ads yet. Create one to feature on the customer dashboard.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ads.map((ad: any) => (
              <Card key={ad.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground truncate">{ad.title}</h3>
                    <Badge variant="secondary" className="text-[10px] capitalize mt-1">{ad.category}</Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={ad.is_active}
                      onCheckedChange={(checked) => toggleActive.mutate({ id: ad.id, is_active: checked })}
                    />
                  </div>
                </div>
                {ad.description && <p className="text-xs text-muted-foreground line-clamp-2">{ad.description}</p>}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Priority: {ad.priority}</span>
                  <span>{ad.is_active ? <Eye className="w-3 h-3 inline" /> : <EyeOff className="w-3 h-3 inline" />} {ad.is_active ? "Active" : "Inactive"}</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => openEdit(ad)}>
                    <Edit className="w-3 h-3" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" className="gap-1 text-xs" onClick={() => deleteAd.mutate(ad.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showCreate} onOpenChange={(open) => { setShowCreate(open); if (!open) { setEditingAd(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAd ? "Edit Ad" : "Create Ad"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ad title" maxLength={100} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description" maxLength={300} />
            </div>
            <div>
              <Label>Image URL</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div>
              <Label>Link URL</Label>
              <Input value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="/shops or external URL" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="shop">Shop</SelectItem>
                    <SelectItem value="service">Service</SelectItem>
                    <SelectItem value="transport">Transport</SelectItem>
                    <SelectItem value="offer">Offer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority (higher = shown first)</Label>
                <Input type="number" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createAd.isPending || updateAd.isPending}>
              {editingAd ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EmployeeLayout>
  );
};

export default EmployeeAds;
