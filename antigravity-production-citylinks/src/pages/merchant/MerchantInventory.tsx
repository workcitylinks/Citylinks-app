import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import MerchantLayout from "@/components/merchant/MerchantLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Package, Search, Edit2, Trash2 } from "lucide-react";

const MerchantInventory = () => {
  const { merchant } = useMerchant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", price: "", cost_price: "", stock_quantity: "", unit: "piece", category_id: "", is_online: false, description: "" });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data } = await supabase.from("merchant_categories").select("*").eq("is_active", true).order("name");
      return data || [];
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["inventory", merchant?.id, search],
    queryFn: async () => {
      if (!merchant) return [];
      let q = supabase.from("merchant_products").select("*").eq("merchant_id", merchant.id).order("name");
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchant,
  });

  const resetForm = () => {
    setForm({ name: "", sku: "", price: "", cost_price: "", stock_quantity: "", unit: "piece", category_id: "", is_online: false, description: "" });
    setEditingId(null);
  };

  const openEdit = (p: any) => {
    setForm({
      name: p.name,
      sku: p.sku || "",
      price: String(p.price),
      cost_price: p.cost_price ? String(p.cost_price) : "",
      stock_quantity: String(p.stock_quantity),
      unit: p.unit,
      category_id: p.category_id || "",
      is_online: p.is_online,
      description: p.description || "",
    });
    setEditingId(p.id);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!merchant || !form.name.trim()) throw new Error("Name required");
      const payload = {
        merchant_id: merchant.id,
        name: form.name.trim(),
        sku: form.sku || null,
        price: parseFloat(form.price) || 0,
        cost_price: form.cost_price ? parseFloat(form.cost_price) : null,
        stock_quantity: parseInt(form.stock_quantity) || 0,
        unit: form.unit,
        category_id: form.category_id || null,
        is_online: form.is_online,
        description: form.description || null,
      };
      if (editingId) {
        const { error } = await supabase.from("merchant_products").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("merchant_products").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success(editingId ? "Product updated" : "Product added");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("merchant_products").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast.success("Product removed");
    },
  });

  const set = (key: string, value: any) => setForm((p) => ({ ...p, [key]: value }));

  return (
    <MerchantLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h1 className="font-display text-2xl font-bold text-foreground">Inventory</h1>
          <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-portal-merchant hover:bg-portal-merchant/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-1" /> Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-strong max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display">{editingId ? "Edit Product" : "Add Product"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} />
                </div>
                <div>
                  <Label>SKU</Label>
                  <Input value={form.sku} onChange={(e) => set("sku", e.target.value)} maxLength={50} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {categories?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Price (₹) *</Label>
                  <Input type="number" value={form.price} onChange={(e) => set("price", e.target.value)} />
                </div>
                <div>
                  <Label>Cost Price (₹)</Label>
                  <Input type="number" value={form.cost_price} onChange={(e) => set("cost_price", e.target.value)} />
                </div>
                <div>
                  <Label>Stock Qty</Label>
                  <Input type="number" value={form.stock_quantity} onChange={(e) => set("stock_quantity", e.target.value)} />
                </div>
                <div>
                  <Label>Unit</Label>
                  <Select value={form.unit} onValueChange={(v) => set("unit", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="piece">Piece</SelectItem>
                      <SelectItem value="kg">Kg</SelectItem>
                      <SelectItem value="litre">Litre</SelectItem>
                      <SelectItem value="pack">Pack</SelectItem>
                      <SelectItem value="dozen">Dozen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 flex items-center gap-3">
                  <Switch checked={form.is_online} onCheckedChange={(v) => set("is_online", v)} />
                  <Label>List online (visible to customers)</Label>
                </div>
                <div className="sm:col-span-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={500} />
                </div>
              </div>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="w-full bg-portal-merchant hover:bg-portal-merchant/90 text-primary-foreground mt-2">
                {editingId ? "Update Product" : "Add Product"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search inventory..." value={search} onChange={(e) => setSearch(e.target.value)} maxLength={100} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products?.filter((p) => p.is_active).map((p) => (
            <Card key={p.id} className="glass p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="font-medium text-foreground truncate">{p.name}</h3>
                  {p.sku && <p className="text-xs text-muted-foreground">SKU: {p.sku}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-bold text-portal-merchant">₹{Number(p.price)}</span>
                <span className="text-muted-foreground">Stock: {p.stock_quantity} {p.unit}</span>
              </div>
              <div className="flex gap-2">
                {p.is_online && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-portal-customer/15 text-portal-customer">Online</span>
                )}
              </div>
            </Card>
          ))}
          {!isLoading && products?.filter((p) => p.is_active).length === 0 && (
            <div className="col-span-full text-center py-12">
              <Package className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No products yet. Add your first product!</p>
            </div>
          )}
        </div>
      </div>
    </MerchantLayout>
  );
};

export default MerchantInventory;
