import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Car,
  Bike,
  Truck,
  Package,
  MapPin,
  Star,
  Search,
  Users,
  ShoppingBag,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";

const vehicleTypeConfig: Record<string, { icon: any; color: string; category: "passenger" | "commercial" }> = {
  scooty: { icon: Bike, color: "bg-violet-500/10 text-violet-600", category: "passenger" },
  bike: { icon: Bike, color: "bg-blue-500/10 text-blue-600", category: "passenger" },
  auto_rickshaw: { icon: Car, color: "bg-yellow-500/10 text-yellow-600", category: "passenger" },
  car: { icon: Car, color: "bg-emerald-500/10 text-emerald-600", category: "passenger" },
  tata_ace: { icon: Truck, color: "bg-teal-500/10 text-teal-600", category: "commercial" },
  pickup_truck: { icon: Package, color: "bg-orange-500/10 text-orange-600", category: "commercial" },
  truck: { icon: Truck, color: "bg-slate-500/10 text-slate-600", category: "commercial" },
  tempo: { icon: Truck, color: "bg-amber-500/10 text-amber-600", category: "commercial" },
};

const passengerRecommendations = [
  { name: "Auto Rickshaw", desc: "Affordable short-distance rides", icon: Car, price: "₹30–₹150", eta: "5–15 min" },
  { name: "Bike Taxi", desc: "Quick solo rides in traffic", icon: Bike, price: "₹20–₹100", eta: "5–10 min" },
  { name: "Car", desc: "Comfortable rides for families", icon: Car, price: "₹100–₹500", eta: "10–20 min" },
];

const commercialRecommendations = [
  { name: "Tata Ace", desc: "Small goods & furniture", icon: Truck, price: "₹299–₹999", eta: "30–60 min" },
  { name: "Pickup Truck", desc: "Heavy & bulky goods", icon: Package, price: "₹499–₹1499", eta: "45–90 min" },
  { name: "Tempo", desc: "Bulk commercial transport", icon: Truck, price: "₹999–₹2999", eta: "60–120 min" },
];

const BookTransportPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("passenger");

  const { data: transporters, isLoading } = useQuery({
    queryKey: ["available-transporters"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transporters")
        .select("id, full_name, phone, city, district, state, approval_status")
        .eq("approval_status", "approved")
        .eq("is_active", true);
      return data || [];
    },
  });

  const { data: vehicles } = useQuery({
    queryKey: ["available-vehicles"],
    queryFn: async () => {
      const { data } = await supabase
        .from("transporter_vehicles")
        .select("id, vehicle_name, vehicle_type, capacity, registration_number, transporter_id")
        .eq("is_active", true);
      return data || [];
    },
  });

  const getVehiclesForTransporter = (transporterId: string) =>
    (vehicles || []).filter((v) => v.transporter_id === transporterId);

  const getVehicleCategory = (vehicleType: string): "passenger" | "commercial" => {
    const key = vehicleType.toLowerCase().replace(/\s+/g, "_");
    return vehicleTypeConfig[key]?.category || "commercial";
  };

  const filtered = (transporters || []).filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.full_name.toLowerCase().includes(q) ||
      t.city?.toLowerCase().includes(q) ||
      t.district?.toLowerCase().includes(q)
    );
  });

  // Filter transporters based on whether they have vehicles in the active category
  const filteredByCategory = filtered.filter((t) => {
    const tvehicles = getVehiclesForTransporter(t.id);
    if (tvehicles.length === 0) return true; // show if no vehicles listed
    return tvehicles.some((v) => getVehicleCategory(v.vehicle_type) === activeTab);
  });

  const recommendations = activeTab === "passenger" ? passengerRecommendations : commercialRecommendations;

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-8 pb-6">
          <Button variant="ghost" className="gap-2 mb-4 text-muted-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            <Car className="w-6 h-6 inline mr-2 text-primary" />
            Book Transport
          </h1>
          <p className="text-muted-foreground text-sm mb-6">Rides, deliveries & moving services</p>

          {/* Category Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full max-w-sm grid-cols-2">
              <TabsTrigger value="passenger" className="gap-2">
                <Users className="w-4 h-4" /> Passenger
              </TabsTrigger>
              <TabsTrigger value="commercial" className="gap-2">
                <ShoppingBag className="w-4 h-4" /> Commercial
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Recommendations */}
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {activeTab === "passenger" ? "Recommended Rides" : "Recommended for Goods"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recommendations.map((rec, i) => (
                <motion.div
                  key={rec.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <rec.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{rec.name}</p>
                      <p className="text-[11px] text-muted-foreground">{rec.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{rec.price}</span>
                    <span>ETA: {rec.eta}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="relative max-w-xl mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search by name, city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 glass-strong rounded-2xl border-border/30"
            />
          </div>
        </motion.div>

        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Available {activeTab === "passenger" ? "Ride" : "Goods"} Providers
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse h-48" />
            ))}
          </div>
        ) : filteredByCategory.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Car className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No {activeTab} transporters available</h3>
            <p className="text-sm text-muted-foreground">Check back later for available transport providers</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredByCategory.map((transporter, i) => {
              const tvehicles = getVehiclesForTransporter(transporter.id).filter(
                (v) => getVehicleCategory(v.vehicle_type) === activeTab
              );
              return (
                <motion.div
                  key={transporter.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="glass rounded-2xl p-5 hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-11 h-11 rounded-xl bg-portal-transportation/10 flex items-center justify-center shrink-0">
                      <Car className="w-5 h-5 text-portal-transportation" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground">{transporter.full_name}</h3>
                      {transporter.city && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {transporter.city}{transporter.district ? `, ${transporter.district}` : ""}
                        </p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">Available</Badge>
                  </div>

                  {tvehicles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {tvehicles.map((v) => {
                        const vtype = v.vehicle_type.toLowerCase().replace(/\s+/g, "_");
                        const cfg = vehicleTypeConfig[vtype] || vehicleTypeConfig.car;
                        const VIcon = cfg.icon;
                        return (
                          <Badge key={v.id} variant="outline" className="text-[10px] gap-1 px-2 py-1">
                            <VIcon className="w-3 h-3" /> {v.vehicle_name}
                            {v.capacity && <span className="text-muted-foreground">• {v.capacity}</span>}
                          </Badge>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-end pt-2 border-t border-border/30">
                    <Button size="sm" variant="outline" className="text-xs h-8">
                      Book Now
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookTransportPage;
