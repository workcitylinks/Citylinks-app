import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Search, ArrowLeft, Car, Truck, Bike } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";
import { toast } from "sonner";

const transportOptions = [
  { id: "scooty", name: "Scooty", desc: "Small packages, documents", icon: Bike, capacity: "Up to 5 kg", eta: "15-25 min", price: "₹49", color: "bg-blue-500/10 text-blue-600" },
  { id: "auto", name: "Auto Rickshaw", desc: "Medium packages", icon: Car, capacity: "Up to 20 kg", eta: "20-35 min", price: "₹99", color: "bg-yellow-500/10 text-yellow-600" },
  { id: "tata_ace", name: "Tata Ace", desc: "Large items, bulk orders", icon: Truck, capacity: "Up to 500 kg", eta: "30-60 min", price: "₹299", color: "bg-emerald-500/10 text-emerald-600" },
  { id: "pickup", name: "Pickup Truck", desc: "Heavy/bulky goods", icon: Truck, capacity: "Up to 1000 kg", eta: "45-90 min", price: "₹499", color: "bg-violet-500/10 text-violet-600" },
];

const TransportationPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const { data: locations } = useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("locations")
        .select("id, name, type")
        .eq("is_active", true);
      return data || [];
    },
  });

  const handleGetLocation = () => {
    if (!userLocation) {
      const defaultLoc = locations?.find(l => l.type === 'taluq')?.name || "Haveri";
      setUserLocation(defaultLoc);
      toast.info(`Location set to ${defaultLoc}`);
    } else {
      setUserLocation(null);
      toast.info("Location filter cleared");
    }
  };

  const filteredOptions = transportOptions.filter(opt => 
    opt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    opt.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold font-display">Transportation</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for bikes, trucks, autos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 glass-strong rounded-2xl"
            />
          </div>
          <Button 
            onClick={handleGetLocation} 
            variant={userLocation ? "secondary" : "default"}
            className="h-12 rounded-2xl gap-2 font-semibold"
          >
            <MapPin className="w-5 h-5" />
            {userLocation ? "Location Updated" : "Use My Location"}
          </Button>
        </div>

        {locationError && (
          <p className="text-sm text-red-500 mb-4 bg-red-500/10 p-3 rounded-xl border border-red-500/20">
            {locationError}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredOptions.map((opt) => (
            <motion.div
              key={opt.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              className="glass rounded-2xl p-5 hover:shadow-lg transition-all border border-border/30"
            >
              <div className={`w-12 h-12 rounded-2xl ${opt.color} flex items-center justify-center mb-4`}>
                <opt.icon className="w-6 h-6" />
              </div>
              
              <h3 className="font-bold text-lg text-foreground mb-1">{opt.name}</h3>
              <p className="text-xs text-muted-foreground mb-4">{opt.desc}</p>
              
              <div className="space-y-2 mb-6">
                <p className="text-xs font-medium text-foreground">Capacity: {opt.capacity}</p>
                <p className="text-xs font-medium text-foreground">ETA: {opt.eta}</p>
                <p className="text-lg font-bold text-primary">{opt.price}</p>
              </div>

              <Button className="w-full rounded-xl text-xs gap-2">
                Book Ride <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TransportationPage;
