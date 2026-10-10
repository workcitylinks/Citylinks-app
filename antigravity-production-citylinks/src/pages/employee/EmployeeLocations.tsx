import { useEffect, useState } from "react";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MapPin, ChevronRight } from "lucide-react";

interface Location {
  id: string;
  name: string;
  type: string;
  parent_id: string | null;
  is_active: boolean;
}

const typeOrder = ["state", "district", "taluq", "hobli"];
const typeColors: Record<string, string> = {
  state: "bg-purple-100 text-purple-700",
  district: "bg-blue-100 text-blue-700",
  taluq: "bg-emerald-100 text-emerald-700",
  hobli: "bg-amber-100 text-amber-700",
};

const EmployeeLocations = () => {
  const { toast } = useToast();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState("state");
  const [newParent, setNewParent] = useState<string>("");
  const [selectedType, setSelectedType] = useState("all");

  const fetchLocations = async () => {
    setLoading(true);
    const { data } = await supabase.from("locations").select("*").order("type").order("name");
    if (data) setLocations(data as Location[]);
    setLoading(false);
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("locations").insert({
      name: newName.trim(),
      type: newType,
      parent_id: newParent || null,
    });

    if (!error) {
      toast({ title: "Location added", description: `${newName} (${newType}) created.` });
      setShowAdd(false);
      setNewName("");
      fetchLocations();
    } else {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const parentOptions = () => {
    const idx = typeOrder.indexOf(newType);
    if (idx <= 0) return [];
    const parentType = typeOrder[idx - 1];
    return locations.filter((l) => l.type === parentType);
  };

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    return locations.find((l) => l.id === parentId)?.name;
  };

  const filteredLocations = selectedType === "all" ? locations : locations.filter((l) => l.type === selectedType);

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-display font-bold text-foreground">Location Management</h1>
          <Button onClick={() => setShowAdd(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Location
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant={selectedType === "all" ? "default" : "outline"} onClick={() => setSelectedType("all")}>All</Button>
          {typeOrder.map((t) => (
            <Button key={t} size="sm" variant={selectedType === t ? "default" : "outline"} onClick={() => setSelectedType(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}s ({locations.filter((l) => l.type === t).length})
            </Button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLocations.map((loc) => (
              <Card key={loc.id} className="glass">
                <CardContent className="p-4 flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{loc.name}</p>
                    {loc.parent_id && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <ChevronRight className="w-3 h-3" /> {getParentName(loc.parent_id)}
                      </p>
                    )}
                  </div>
                  <Badge className={typeColors[loc.type]}>{loc.type}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">Type</label>
              <Select value={newType} onValueChange={(v) => { setNewType(v); setNewParent(""); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {typeOrder.map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {parentOptions().length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground">Parent</label>
                <Select value={newParent} onValueChange={setNewParent}>
                  <SelectTrigger><SelectValue placeholder="Select parent..." /></SelectTrigger>
                  <SelectContent>
                    {parentOptions().map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground">Name</label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Location name" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleAdd} disabled={!newName.trim()}>Add Location</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </EmployeeLayout>
  );
};

export default EmployeeLocations;
