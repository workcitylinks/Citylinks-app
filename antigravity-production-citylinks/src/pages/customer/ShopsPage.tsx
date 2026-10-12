import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Search, ArrowLeft, Store } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";
import { toast } from "sonner";

interface Merchant {
  id: string;
  business_name: string;
  business_type: string | null;
  city: string | null;
  district: string | null;
  taluq: string | null;
  phone: string | null;
  distance?: number;
}

const ShopsPage = () => {
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

  const { data: merchants, isLoading } = useQuery({
    queryKey: ["merchants-nearby"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, business_name, business_type, city, district, taluq, phone")
        .eq("approval_status", "approved");
      if (error) throw error;
      return data as Merchant[];
    },
  });

  const handleGetLocation = () => {
    if (!userLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => {
            // Without a reverse geocoding API, just show all shops
            setUserLocation("nearby");
            toast.info("Showing all shops in your area");
          },
          () => {
            setUserLocation("nearby");
            toast.info("Showing all available shops");
          },
          { timeout: 5000 }
        );
      } else {
        setUserLocation("nearby");
        toast.info("Showing all available shops");
      }
    } else {
      setUserLocation(null);
      toast.info("Location filter cleared");
    }
  };

  const filteredShops = (merchants || [])
    .filter((m) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch = !q || 
        m.business_name?.toLowerCase().includes(q) ||
        m.business_type?.toLowerCase().includes(q) ||
        m.city?.toLowerCase().includes(q) ||
        m.district?.toLowerCase().includes(q) ||
        m.taluq?.toLowerCase().includes(q);
      
      const matchesLocation = !userLocation || userLocation === "nearby" ||
        m.city?.toLowerCase().includes(userLocation.toLowerCase()) ||
        m.taluq?.toLowerCase().includes(userLocation.toLowerCase());

      return matchesSearch && matchesLocation;
    });

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button variant="ghost" className="gap-2 mb-4 text-muted-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>

          <h1 className="text-2xl sm:text-3xl font-bold font-display flex items-center">
            <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-3 text-primary">
              <MapPin className="w-6 h-6" />
            </span>
            Near by Shops
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Find and explore stores around you
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 w-5 h-5 text-muted-foreground opacity-100 flex-shrink-0" />
            <Input
              placeholder="Search shops by name, type or location..."
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

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-40 glass animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="text-center py-12 glass rounded-3xl">
            <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
            <p className="text-muted-foreground">No shops found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredShops.map((shop) => (
              <motion.div
                key={shop.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="glass rounded-2xl p-5 hover:shadow-lg transition-all border border-border/30"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-foreground truncate">{shop.business_name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{shop.business_type || "General Shop"}</p>
                  </div>
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none">
                    Approved
                  </Badge>
                </div>
                
                <div className="space-y-2 mt-4">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">
                      {[shop.taluq, shop.district, shop.city].filter(Boolean).join(", ") || "Haveri Region"}
                    </span>
                  </div>
                  
                  {userLocation && (
                    <p className="text-xs font-semibold text-primary">
                      Nearby in {userLocation}
                    </p>
                  )}

                  {shop.phone && (
                    <p className="text-xs text-muted-foreground">Phone: {shop.phone}</p>
                  )}
                </div>
                
                <Button className="w-full mt-6 rounded-xl text-xs gap-2" variant="outline" onClick={() => navigate(`/shop/${shop.id}`)}>
                   Visit Shop <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                </Button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShopsPage;
