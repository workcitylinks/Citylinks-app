import { ShoppingBag, Store, Shield, Wrench, Truck } from "lucide-react";
import HeroSection from "@/components/landing/HeroSection";
import PortalCard from "@/components/landing/PortalCard";
import FloatingOrbs from "@/components/landing/FloatingOrbs";

const portals = [
  {
    title: "Customer",
    subtitle: "Marketplace & Services",
    description: "Search products, book services, and connect with local merchants and labor providers.",
    icon: ShoppingBag,
    color: "customer" as const,
    route: "/customer",
  },
  {
    title: "Merchant",
    subtitle: "SimpleBiller POS",
    description: "Manage your shop with fast billing, inventory tracking, and analytics dashboard.",
    icon: Store,
    color: "merchant" as const,
    route: "/merchant",
  },
  {
    title: "Employee",
    subtitle: "Management Portal",
    description: "Oversee operations, approve merchants, and manage regional support tickets.",
    icon: Shield,
    color: "employee" as const,
    route: "/employee",
  },
  {
    title: "Labor",
    subtitle: "Service Provider Hub",
    description: "Manage your jobs, set availability, and grow your service reputation.",
    icon: Wrench,
    color: "labor" as const,
    route: "/labor",
  },
  {
    title: "Transportation",
    subtitle: "Rides & Logistics",
    description: "Book rides, deliveries, and moving services from local transport providers.",
    icon: Truck,
    color: "transportation" as const,
    route: "/transportation",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <HeroSection />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 md:gap-6">
          {portals.map((portal, index) => (
            <PortalCard key={portal.title} {...portal} index={index} />
          ))}
        </div>

        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by <span className="font-semibold text-foreground">CityLinks</span> — Your Hyperlocal Partner
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
