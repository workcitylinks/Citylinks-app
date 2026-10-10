import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Store, Star, ArrowLeft, Search, Navigation } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";
import { useNavigate } from "react-router-dom";

const NearbyShops = () => {
  const navigate = useNavigate();
  const [locationInput, setLocationInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [locationSet, setLocationSet] = useState(false);
  const [detecting, setDetecting] = useState(false);

  const { data: shops, isLoading } = useQuery({
    queryKey: ["nearby-shops", locationInput],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchants")
        .select("id, business_name, business_type, address, city, phone, approval_status")
        .eq("approval_status", "approved")
        .eq("onboarding_complete", true);
      if (error) throw error;
      return data || [];
    },
    enabled: locationSet,
  });

  const filteredShops = shops?.filter((shop) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      shop.business_name.toLowerCase().includes(q) ||
      shop.business_type.toLowerCase().includes(q) ||
      (shop.address || "").toLowerCase().includes(q)
    );
  });

  const handleDetectLocation = () => {
    setDetecting(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationInput(`${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
          setLocationSet(true);
          setDetecting(false);
        },
        () => {
          setLocationInput("Location detected");
          setLocationSet(true);
          setDetecting(false);
        },
        { timeout: 5000 }
      );
    } else {
      setLocationInput("Haveri, Karnataka");
      setLocationSet(true);
      setDetecting(false);
    }
  };

  const handleSetLocation = () => {
    if (locationInput.trim()) {
      setLocationSet(true);
    }
  };

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Header */}
        <div className="pt-6 pb-4">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">
            <MapPin className="w-6 h-6 inline mr-2 text-primary" />
            Nearby Shops
          </h1>
          <p className="text-muted-foreground text-sm">Find stores near your location</p>
        </div>

        {/* Location Input */}
        {!locationSet ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-6 sm:p-8 mb-6"
          >
            <h2 className="font-display text-lg font-semibold text-foreground mb-4">
              Enter your location
            </h2>
            <div className="space-y-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Enter area, locality or pincode..."
                  value={locationInput}
                  onChange={(e) => setLocationInput(e.target.value)}
                  className="pl-11 h-12 rounded-xl"
                  onKeyDown={(e) => e.key === "Enter" && handleSetLocation()}
                />
              </div>
              <div className="flex gap-3">
                <Button onClick={handleSetLocation} disabled={!locationInput.trim()} className="flex-1">
                  <Search className="w-4 h-4 mr-2" /> Find Shops
                </Button>
                <Button variant="outline" onClick={handleDetectLocation} disabled={detecting} className="gap-2">
                  <Navigation className="w-4 h-4" />
                  {detecting ? "Detecting..." : "Use My Location"}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <>
            {/* Location bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl p-3 mb-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm text-foreground font-medium">{locationInput}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setLocationSet(false)}
              >
                Change
              </Button>
            </motion.div>

            {/* Search filter */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search shops by name or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 rounded-xl"
              />
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                    <div className="h-5 bg-muted rounded w-1/3 mb-2" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : filteredShops && filteredShops.length > 0 ? (
              <div className="space-y-3">
                {filteredShops.map((shop, i) => (
                  <motion.div
                    key={shop.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(`/shop/${shop.id}`)}
                    className="glass rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-portal-merchant/10 flex items-center justify-center shrink-0">
                        <Store className="w-6 h-6 text-portal-merchant" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {shop.business_name}
                        </h3>
                        <Badge variant="secondary" className="text-[10px] mt-1 capitalize">
                          {shop.business_type}
                        </Badge>
                        {shop.address && (
                          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {shop.address}{shop.city ? `, ${shop.city}` : ""}
                          </p>
                        )}
                        {shop.phone && (
                          <p className="text-xs text-muted-foreground mt-0.5">📞 {shop.phone}</p>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-16"
              >
                <Store className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold text-foreground mb-1">No shops found</h3>
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? "Try a different search term" : "No approved shops in this area yet"}
                </p>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NearbyShops;
