import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Search,
  Laptop,
  Globe,
  FileText,
  Palette,
  Target,
  Server,
  TrendingUp,
  Users,
  Megaphone,
  Sparkles,
  Phone,
  Star,
  MapPin,
  MoreHorizontal,
  Briefcase,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";
import { toast } from "sonner";

interface DigitalServiceItem {
  id: string;
  name: string;
  desc: string;
  badge: string | null;
  color: string;
  iconName: string;
}

interface DigitalServiceProviderItem {
  id: string;
  name: string;
  serviceType: string;
  phone: string | null;
  rating: number;
  priceLabel: string;
  location: string;
  description: string | null;
  isAvailable: boolean;
  badge: string | null;
}

const ICON_MAP: Record<string, any> = {
  Globe,
  FileText,
  Palette,
  Target,
  Server,
  TrendingUp,
  Users,
  Megaphone,
  Laptop,
  MoreHorizontal,
};

const DEFAULT_DIGITAL_SERVICES: DigitalServiceItem[] = [
  { id: "ds-1", name: "Website Creation", iconName: "Globe", color: "#2563eb", badge: "Instant", desc: "Modern & fast websites" },
  { id: "ds-2", name: "Blog & Content writing", iconName: "FileText", color: "#d97706", badge: "SEO Ready", desc: "Articles, blogs & copy" },
  { id: "ds-3", name: "Poster & Social media Creatives", iconName: "Palette", color: "#7c3aed", badge: null, desc: "Posters, banners & posts" },
  { id: "ds-4", name: "Local & Targeted Ads", iconName: "Target", color: "#059669", badge: "High ROI", desc: "Google & Meta local ads" },
  { id: "ds-5", name: "website hosting & Support", iconName: "Server", color: "#0891b2", badge: null, desc: "Domains, SSL & 24/7 care" },
  { id: "ds-6", name: "Ad campaingn setup & management", iconName: "TrendingUp", color: "#db2777", badge: "Assisted", desc: "Turnkey ad campaigns" },
  { id: "ds-7", name: "Influencer collaboration", iconName: "Users", color: "#4f46e5", badge: null, desc: "Connect with local creators" },
  { id: "ds-8", name: "local business promotion", iconName: "Megaphone", color: "#0d9488", badge: null, desc: "Boost local visibility" },
  { id: "ds-9", name: "Others", iconName: "MoreHorizontal", color: "#64748b", badge: "Custom", desc: "App development, video editing & other requests" },
];

const DigitalServicesPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialCategory = searchParams.get("service") || searchParams.get("category") || searchParams.get("filter") || "";
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedService, setSelectedService] = useState(initialCategory);

  useEffect(() => {
    const param = searchParams.get("service") || searchParams.get("category") || searchParams.get("filter");
    if (param !== null) {
      setSelectedService(param || "");
    }
  }, [searchParams]);

  // Fetch filter categories dynamically from PostgreSQL DB
  const { data: services } = useQuery<DigitalServiceItem[]>({
    queryKey: ["digital-services-list"],
    queryFn: async () => {
      try {
        const res = await fetch("http://192.168.0.108:5001/api/marketplace/digital-services");
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json) && json.length > 0) return json;
        }
      } catch (e) {
        // Fallback
      }
      return DEFAULT_DIGITAL_SERVICES;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch providers (people who give the service) dynamically from backend
  const { data: providers, isLoading } = useQuery<DigitalServiceProviderItem[]>({
    queryKey: ["digital-providers-list", selectedService, searchQuery],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        if (selectedService && selectedService !== "All") params.append("category", selectedService);
        if (searchQuery.trim()) params.append("q", searchQuery.trim());
        const res = await fetch(`http://192.168.0.108:5001/api/marketplace/digital-providers?${params.toString()}`);
        if (res.ok) {
          return await res.json();
        }
      } catch (e) {
        // Fallback
      }
      return [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const allServices = services || DEFAULT_DIGITAL_SERVICES;

  const handleCall = (phone: string | null, name: string) => {
    if (!phone) {
      toast.error("Contact phone number unavailable");
      return;
    }
    toast.success(`Connecting to ${name}...`);
    window.location.href = `tel:${phone}`;
  };

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-8 pb-6">
          <Button variant="ghost" className="gap-2 mb-4 text-muted-foreground" onClick={() => navigate("/")}>
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Button>

          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2 flex items-center">
            <span className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mr-3 text-primary">
              <Laptop className="w-6 h-6" />
            </span>
            Digital Services
          </h1>
          <p className="text-muted-foreground text-sm mb-6">
            Hire verified digital experts, agencies & freelance professionals
          </p>

          <div className="relative max-w-xl mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search experts, agencies, skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 glass-strong rounded-2xl border-border/30"
            />
          </div>

          {/* Section Filter Pills with respective icons from DB */}
          <div className="flex flex-wrap gap-2 mb-8">
            <Badge
              variant={selectedService === "" || selectedService === "All" ? "default" : "outline"}
              className="cursor-pointer px-3.5 py-1.5 text-xs flex items-center gap-1.5 shadow-sm transition-all"
              onClick={() => setSelectedService("")}
            >
              <Sparkles className="w-3.5 h-3.5" />
              All Services
            </Badge>
            {allServices.map((service) => {
              const Icon = ICON_MAP[service.iconName] || Globe;
              const isSelected = selectedService.toLowerCase() === service.name.toLowerCase();
              return (
                <Badge
                  key={service.id}
                  variant={isSelected ? "default" : "outline"}
                  className="cursor-pointer px-3.5 py-1.5 text-xs flex items-center gap-1.5 shadow-sm transition-all"
                  onClick={() => setSelectedService(isSelected ? "" : service.name)}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: isSelected ? "currentColor" : service.color }} />
                  {service.name}
                </Badge>
              );
            })}
          </div>
        </motion.div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse h-44" />
            ))}
          </div>
        ) : !providers || providers.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No digital specialists found</h3>
            <p className="text-sm text-muted-foreground">Try selecting "All Services" or adjusting your search query</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {providers.map((p, i) => (
              <motion.div
                key={p.id || i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="glass rounded-2xl p-5 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[11px] font-semibold text-primary bg-primary/10">
                        {p.serviceType}
                      </Badge>
                      {p.badge && (
                        <Badge variant="secondary" className="text-[10px] font-semibold text-emerald-600 bg-emerald-50">
                          {p.badge}
                        </Badge>
                      )}
                    </div>

                    <span className="text-sm font-extrabold text-primary">
                      {p.priceLabel}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-foreground mt-2 mb-0.5">
                    {p.name}
                  </h3>
                  <p className="text-xs text-muted-foreground/80 mb-2">
                    Digital Service Specialist
                  </p>
                  <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                    {p.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/30">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {p.location}
                    </span>
                    <span className="flex items-center text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                      <Star className="w-3 h-3 fill-amber-400 mr-1" />
                      {p.rating}
                    </span>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => handleCall(p.phone, p.name)}
                    className="text-xs h-8 gap-1.5 shadow-sm"
                  >
                    <Phone className="w-3 h-3" />
                    Call / Contact
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DigitalServicesPage;
