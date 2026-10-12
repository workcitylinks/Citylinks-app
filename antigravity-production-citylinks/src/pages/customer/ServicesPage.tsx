import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Search,
  Wrench,
  Zap,
  Sparkles,
  PaintBucket,
  Scissors,
  Home,
  Star,
  MapPin,
  Filter,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";

const categoryConfig: Record<string, { icon: any; color: string; label: string }> = {
  plumbing: { icon: Wrench, color: "bg-blue-500/10 text-blue-600", label: "Plumbing" },
  electrician: { icon: Zap, color: "bg-yellow-500/10 text-yellow-600", label: "Electrician" },
  cleaning: { icon: Sparkles, color: "bg-emerald-500/10 text-emerald-600", label: "Cleaning" },
  painting: { icon: PaintBucket, color: "bg-orange-500/10 text-orange-600", label: "Painting" },
  salon: { icon: Scissors, color: "bg-pink-500/10 text-pink-600", label: "Salon" },
  carpentry: { icon: Home, color: "bg-amber-500/10 text-amber-700", label: "Carpentry" },
  general: { icon: Wrench, color: "bg-muted text-muted-foreground", label: "General" },
  others: { icon: MoreHorizontal, color: "bg-slate-500/10 text-slate-600", label: "Others" },
};

const allCategories = Object.keys(categoryConfig);

const ServicesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("category") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);

  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat !== null) {
      setSelectedCategory(cat);
    }
  }, [searchParams]);

  const { data: services, isLoading } = useQuery({
    queryKey: ["all-labor-services"],
    queryFn: async () => {
      const { data } = await supabase
        .from("labor_services")
        .select("id, service_name, category, hourly_rate, description, labor_id")
        .eq("is_active", true);
      return data || [];
    },
  });

  const filtered = (services || []).filter((s) => {
    const sCat = (s.category || "").toLowerCase();
    const selCat = (selectedCategory || "").toLowerCase();
    const matchesCategory =
      !selectedCategory ||
      sCat === selCat ||
      ((selCat === "others" || selCat === "other") && (sCat === "others" || sCat === "other"));
    const matchesSearch =
      !searchQuery ||
      s.service_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sCat.includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
            <Wrench className="w-6 h-6 inline mr-2 text-primary" />
            Book a Service
          </h1>
          <p className="text-muted-foreground text-sm mb-6">Find skilled professionals near you</p>

          <div className="relative max-w-xl mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 glass-strong rounded-2xl border-border/30"
            />
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2 mb-8">
            <Badge
              variant={selectedCategory === "" ? "default" : "outline"}
              className="cursor-pointer px-3 py-1.5 text-xs"
              onClick={() => setSelectedCategory("")}
            >
              All
            </Badge>
            {allCategories.map((cat) => {
              const cfg = categoryConfig[cat];
              return (
                <Badge
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  className="cursor-pointer px-3 py-1.5 text-xs capitalize"
                  onClick={() => setSelectedCategory(selectedCategory === cat ? "" : cat)}
                >
                  {cfg.label}
                </Badge>
              );
            })}
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse h-40" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Wrench className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No services found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((service, i) => {
              const cat = categoryConfig[service.category.toLowerCase()] || categoryConfig.general;
              const Icon = cat.icon;
              return (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="glass rounded-2xl p-5 cursor-pointer group hover:shadow-lg transition-all"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-11 h-11 rounded-xl ${cat.color} flex items-center justify-center shrink-0`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">{service.service_name}</h3>
                      <Badge variant="secondary" className="text-[10px] capitalize mt-1">{service.category}</Badge>
                    </div>
                  </div>
                  {service.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{service.description}</p>
                  )}
                  <div className="flex items-center justify-between pt-2 border-t border-border/30">
                    {service.hourly_rate ? (
                      <span className="font-bold text-sm text-primary">₹{Number(service.hourly_rate)}/hr</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Contact for pricing</span>
                    )}
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

export default ServicesPage;
