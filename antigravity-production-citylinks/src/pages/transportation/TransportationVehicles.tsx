import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTransporter } from "@/hooks/useTransporter";
import { supabase } from "@/integrations/supabase/client";
import TransportationLayout from "@/components/transportation/TransportationLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Truck, Plus } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const vehicleTypes = [
  { value: "scooty", label: "Scooty" },
  { value: "bike", label: "Bike" },
  { value: "auto", label: "Auto Rickshaw" },
  { value: "car", label: "Car" },
  { value: "tata_ace", label: "Tata Ace" },
  { value: "mini_truck", label: "Mini Truck" },
  { value: "truck", label: "Truck" },
  { value: "tempo", label: "Tempo" },
];

const TransportationVehicles = () => {
  const { user } = useAuth();
  const { transporter } = useTransporter();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ vehicle_type: "scooty", vehicle_name: "", registration_number: "", capacity: "" });

  useEffect(() => {
    if (!user) { navigate("/auth"); return; }
    if (transporter) fetchVehicles();
  }, [transporter]);

  const fetchVehicles = async () => {
    const { data } = await supabase.from("transporter_vehicles" as any).select("*").eq("transporter_id", transporter.id).order("created_at", { ascending: false });
    if (data) setVehicles(data);
  };

  const handleAdd = async () => {
    if (!form.vehicle_name.trim()) { toast.error("Vehicle name is required"); return; }
    const { error } = await (supabase.from("transporter_vehicles" as any) as any).insert({ ...form, transporter_id: transporter.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Vehicle added!");
    setOpen(false);
    setForm({ vehicle_type: "scooty", vehicle_name: "", registration_number: "", capacity: "" });
    fetchVehicles();
  };

  return (
    <TransportationLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-foreground">My Vehicles</h1>
          <Button onClick={() => setOpen(true)} className="gap-2 bg-portal-transportation hover:bg-portal-transportation/90">
            <Plus className="w-4 h-4" /> Add Vehicle
          </Button>
        </div>

        {vehicles.length === 0 ? (
          <Card className="glass p-12 text-center">
            <Truck className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-muted-foreground">No vehicles added yet. Add your first vehicle to get started.</p>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map((v: any) => (
              <Card key={v.id} className="glass p-4 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-portal-transportation/15 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-portal-transportation" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{v.vehicle_name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{v.vehicle_type.replace("_", " ")}</p>
                  </div>
                </div>
                {v.registration_number && <p className="text-xs text-muted-foreground">Reg: {v.registration_number}</p>}
                {v.capacity && <p className="text-xs text-muted-foreground">Capacity: {v.capacity}</p>}
              </Card>
            ))}
          </div>
        )}

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Vehicle</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Vehicle Type</Label>
                <Select value={form.vehicle_type} onValueChange={(v) => setForm((p) => ({ ...p, vehicle_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Vehicle Name *</Label><Input value={form.vehicle_name} onChange={(e) => setForm((p) => ({ ...p, vehicle_name: e.target.value }))} placeholder="e.g. Honda Activa" /></div>
              <div><Label>Registration Number</Label><Input value={form.registration_number} onChange={(e) => setForm((p) => ({ ...p, registration_number: e.target.value }))} placeholder="KA-01-AB-1234" /></div>
              <div><Label>Capacity</Label><Input value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} placeholder="e.g. 2 passengers, 500 kg" /></div>
            </div>
            <DialogFooter><Button onClick={handleAdd}>Add Vehicle</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TransportationLayout>
  );
};

export default TransportationVehicles;
