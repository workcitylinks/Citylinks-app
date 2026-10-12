import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  ShoppingBag,
  Wrench,
  Car,
  Zap,
  Home,
  Scissors,
  PaintBucket,
  Truck,
  Sparkles,
  MapPin,
  ArrowRight,
  Star,
  Clock,
  TrendingUp,
  Store,
  Shield,
  ShoppingCart,
  Plus,
  Minus,

  Package,
  Bike,
  Users,
  CheckCircle2,
  Laptop,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";
import { toast } from "sonner";

const serviceGroups = [
  {
    label: "Transport & Moving",
    items: [
      { name: "Transport", icon: Car, color: "bg-violet-500/10 text-violet-600", group: "transport" },
      { name: "Moving", icon: Truck, color: "bg-teal-500/10 text-teal-600", group: "transport" },
    ],
  },
  {
    label: "Home Services",
    items: [
      { name: "Plumbing", icon: Wrench, color: "bg-blue-500/10 text-blue-600", group: "home" },
      { name: "Electrician", icon: Zap, color: "bg-yellow-500/10 text-yellow-600", group: "home" },
      { name: "Painting", icon: PaintBucket, color: "bg-orange-500/10 text-orange-600", group: "home" },
      { name: "Carpentry", icon: Home, color: "bg-amber-500/10 text-amber-700", group: "home" },
    ],
  },
  {
    label: "Personal Care",
    items: [
      { name: "Salon", icon: Scissors, color: "bg-pink-500/10 text-pink-600", group: "personal" },
      { name: "Cleaning", icon: Sparkles, color: "bg-emerald-500/10 text-emerald-600", group: "personal" },
    ],
  },
];

const shopCategories = [
  { name: "Apparel", icon: Scissors, color: "bg-pink-500/10 text-pink-600" },
  { name: "Automobile", icon: Car, color: "bg-slate-500/10 text-slate-600" },
  { name: "Electronics", icon: Zap, color: "bg-indigo-500/10 text-indigo-600" },
  { name: "Groceries", icon: ShoppingBag, color: "bg-green-500/10 text-green-600" },
];

const featuredServices = [
  { name: "AC Repair & Service", provider: "CoolAir Experts", rating: 4.8, reviews: 234, price: "₹399", image: "🧊", tag: "Top Rated" },
  { name: "Home Deep Cleaning", provider: "SparkleClean Pro", rating: 4.7, reviews: 189, price: "₹999", image: "✨", tag: "Popular" },
  { name: "Electrician Visit", provider: "PowerFix Hub", rating: 4.9, reviews: 312, price: "₹199", image: "⚡", tag: "Trending" },
  { name: "Plumbing Repair", provider: "PipeMaster", rating: 4.6, reviews: 156, price: "₹249", image: "🔧", tag: "Best Value" },
  { name: "Sofa & Carpet Cleaning", provider: "FreshHome Living", rating: 4.8, reviews: 145, price: "₹499", image: "🛋️", tag: "Popular" },
  { name: "Water Purifier Service", provider: "AquaPure Solutions", rating: 4.7, reviews: 198, price: "₹299", image: "💧", tag: "Verified" },
  { name: "Washing Machine Repair", provider: "ApplianceCare 24/7", rating: 4.9, reviews: 210, price: "₹349", image: "🧺", tag: "Top Rated" },
  { name: "Pest Control Treatment", provider: "SafeGuard Pest Pro", rating: 4.8, reviews: 167, price: "₹799", image: "🛡️", tag: "Trending" },
];

const quickActions = [
  { label: "Near by Shops", icon: MapPin, description: "Find stores around you", action: "shops" },
  { label: "Book Service", icon: Wrench, description: "Hire local professionals", action: "services" },
  { label: "Digital Services", icon: Laptop, description: "Make your work digital", action: "digital" },
  { label: "Transport", icon: Car, description: "Rides & delivery that you can trust on", action: "transport" },
  { label: "Deals & Offers", icon: TrendingUp, description: "Today's best deals", action: "deals" },
];

const transportOptions = [
  { id: "scooty", name: "Scooty", desc: "Small packages, documents", icon: Bike, capacity: "Up to 5 kg", eta: "15-25 min", price: "₹49" },
  { id: "auto", name: "Auto Rickshaw", desc: "Medium packages", icon: Car, capacity: "Up to 20 kg", eta: "20-35 min", price: "₹99" },
  { id: "tata_ace", name: "Tata Ace", desc: "Large items, bulk orders", icon: Truck, capacity: "Up to 500 kg", eta: "30-60 min", price: "₹299" },
  { id: "pickup", name: "Pickup Truck", desc: "Heavy/bulky goods", icon: Package, capacity: "Up to 1000 kg", eta: "45-90 min", price: "₹499" },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  merchant_name: string;
  merchant_id?: string;
}

interface FeaturedAd {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  category: string;
  priority: number;
}

interface PopularItem {
  entity_type: "product" | "service" | "transport" | "shop";
  entity_id: string;
  title: string;
  subtitle: string;
  link_url: string;
  badge: string;
  price_label: string | null;
  popularity: number;
}

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { user, roles, loading: authLoading } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"cart" | "transport" | "labor" | "confirm">("cart");
  const [selectedTransport, setSelectedTransport] = useState("scooty");
  const [needLabor, setNeedLabor] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  // Auto-redirect professionals to their portal
  useEffect(() => {
    if (authLoading || !user) return;
    // Only auto-redirect if user has no explicit intent to be on customer dashboard
    // (e.g., they navigated here directly or logged in)
    if (roles.includes("merchant" as any) && !roles.includes("customer" as any)) {
      navigate("/merchant", { replace: true });
    } else if (roles.includes("labor" as any) && !roles.includes("customer" as any)) {
      navigate("/labor", { replace: true });
    } else if (roles.includes("transportation" as any) && !roles.includes("customer" as any)) {
      navigate("/transportation", { replace: true });
    } else if (roles.includes("employee" as any) && !roles.includes("customer" as any)) {
      navigate("/employee", { replace: true });
    }
  }, [authLoading, user, roles, navigate]);

  // Determine if user has a professional role
  const hasProfessionalRole = roles.some(r => ["merchant", "labor", "transportation"].includes(r));
  const isStaffEmail = user?.email?.endsWith("@citylinks.in");
  const hasEmployeeRole = roles.includes("employee" as any);
  const serviceTiles = serviceGroups.flatMap((group) => group.items);

  // Fetch available online products
  const { data: products } = useQuery({
    queryKey: ["online-products"],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_products")
        .select("id, name, price, description, unit, stock_quantity, merchant_id")
        .eq("is_online", true)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .limit(20);
      return data || [];
    },
  });

  // Fetch merchants for display names
  const { data: merchants } = useQuery({
    queryKey: ["merchants-list"],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchants")
        .select("id, business_name")
        .eq("approval_status", "approved");
      return data || [];
    },
  });

  // Fetch available labor services
  const { data: laborServices } = useQuery({
    queryKey: ["labor-services-available"],
    queryFn: async () => {
      const { data } = await supabase
        .from("labor_services")
        .select("id, service_name, category, hourly_rate, labor_id")
        .eq("is_active", true)
        .limit(10);
      return data || [];
    },
    enabled: needLabor,
  });

  // Inline search queries
  const { data: searchProducts } = useQuery({
    queryKey: ["inline-search-products", searchQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_products")
        .select("id, name, price, description, unit, stock_quantity, merchant_id")
        .eq("is_online", true)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .ilike("name", `%${searchQuery}%`)
        .limit(20);
      return data || [];
    },
    enabled: searchQuery.trim().length >= 2,
  });

  const { data: searchShops } = useQuery({
    queryKey: ["inline-search-shops", searchQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchants")
        .select("id, business_name, business_type, city")
        .eq("approval_status", "approved")
        .or(`business_name.ilike.%${searchQuery}%,business_type.ilike.%${searchQuery}%`)
        .limit(10);
      return data || [];
    },
    enabled: searchQuery.trim().length >= 2,
  });

  const { data: searchServices } = useQuery({
    queryKey: ["inline-search-services", searchQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from("labor_services")
        .select("id, service_name, category, hourly_rate, labor_id")
        .eq("is_active", true)
        .or(`service_name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`)
        .limit(10);
      return data || [];
    },
    enabled: searchQuery.trim().length >= 2,
  });

  const hasSearchResults = (searchProducts && searchProducts.length > 0) || (searchShops && searchShops.length > 0) || (searchServices && searchServices.length > 0);

  const { data: featuredAds = [] } = useQuery({
    queryKey: ["featured-ads"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_featured_ads", { _limit: 4 });
      if (error) return [] as FeaturedAd[];
      return (data || []) as FeaturedAd[];
    },
  });

  const { data: popularItems = [] } = useQuery({
    queryKey: ["marketplace-popular-items"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_marketplace_popular_items", { _limit: 8 });
      if (error) return [] as PopularItem[];
      return (data || []) as PopularItem[];
    },
  });

  const getMerchantName = (merchantId: string) =>
    merchants?.find((m) => m.id === merchantId)?.business_name || "Local Shop";

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          name: product.name,
          price: Number(product.price),
          quantity: 1,
          merchant_name: getMerchantName(product.merchant_id),
          merchant_id: product.merchant_id,
        },
      ];
    });
    toast.success(`${product.name} added to cart`);
  };

  const updateQty = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const selectedTransportOption = transportOptions.find((t) => t.id === selectedTransport);
  const transportPrice = parseInt(selectedTransportOption?.price.replace("₹", "") || "0");

  const fallbackPopularItems: PopularItem[] = [
    ...(products || []).slice(0, 4).map((product) => ({
      entity_type: "product" as const,
      entity_id: product.id,
      title: product.name,
      subtitle: getMerchantName(product.merchant_id),
      link_url: `/shop/${product.merchant_id}`,
      badge: "Product",
      price_label: `₹${Number(product.price).toLocaleString()} / ${product.unit}`,
      popularity: Number(product.stock_quantity || 0),
    })),
    ...(merchants || []).slice(0, 4).map((merchant) => ({
      entity_type: "shop" as const,
      entity_id: merchant.id,
      title: merchant.business_name,
      subtitle: "Approved shop",
      link_url: `/shop/${merchant.id}`,
      badge: "Shop",
      price_label: null,
      popularity: 0,
    })),
  ].slice(0, 8);

  const popularDiscoveryItems = popularItems.length > 0 ? popularItems : fallbackPopularItems;

  // Pagination for Featured (4 at a time) and Popular near you (4 at a time)
  const [featuredPage, setFeaturedPage] = useState(1);
  const [popularPage, setPopularPage] = useState(1);

  const displayFeaturedList = featuredAds.length > 0 ? featuredAds : featuredServices;
  const totalFeaturedPages = Math.max(1, Math.ceil(displayFeaturedList.length / 4));
  const paginatedFeatured = displayFeaturedList.slice((featuredPage - 1) * 4, featuredPage * 4);

  const totalPopularPages = Math.max(1, Math.ceil(popularDiscoveryItems.length / 4));
  const paginatedPopular = popularDiscoveryItems.slice((popularPage - 1) * 4, popularPage * 4);

  useEffect(() => {
    if (featuredPage > totalFeaturedPages) setFeaturedPage(totalFeaturedPages);
  }, [totalFeaturedPages, featuredPage]);

  useEffect(() => {
    if (popularPage > totalPopularPages) setPopularPage(totalPopularPages);
  }, [totalPopularPages, popularPage]);

  const handleDiscoveryNavigation = (linkUrl?: string | null) => {
    if (!linkUrl) return;

    if (linkUrl.startsWith("/")) {
      navigate(linkUrl);
      return;
    }

    window.open(linkUrl, "_blank", "noopener,noreferrer");
  };

  const [placingOrder, setPlacingOrder] = useState(false);

  const handlePlaceOrder = async () => {
    if (!user) {
      toast.error("Please sign in to place an order");
      navigate("/login");
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error("Please enter a delivery address");
      return;
    }
    setPlacingOrder(true);
    try {
      const orderNumber = `CL-${Date.now().toString(36).toUpperCase()}`;
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          order_number: orderNumber,
          customer_id: user.id,
          subtotal: cartTotal,
          transport_type: selectedTransport,
          transport_price: transportPrice,
          total_amount: cartTotal + transportPrice,
          delivery_address: deliveryAddress.trim(),
          notes: orderNotes || null,
          need_labor: needLabor,
          status: "pending",
        })
        .select("id")
        .single();

      if (orderError) throw orderError;

      const items = cart.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        product_name: item.name,
        merchant_name: item.merchant_name,
        merchant_id: item.merchant_id || null,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) throw itemsError;
      // Initiate payment via PhonePe
      const totalAmount = cartTotal + transportPrice;
      try {
        const { data: payData, error: payError } = await supabase.functions.invoke("initiate-payment", {
          body: {
            order_id: order.id,
            amount: totalAmount,
            customer_phone: null,
            redirect_url: `${window.location.origin}/orders`,
          },
        });

        if (payError) throw payError;

        if (payData?.success && payData?.data?.payment_url) {
          // Redirect to PhonePe payment page
          window.location.href = payData.data.payment_url;
          return;
        } else {
          // Payment gateway not configured yet — fall back to COD
          toast.success(`Order ${orderNumber} placed! Payment gateway not yet configured — order placed as Cash on Delivery.`);
        }
      } catch (payErr: any) {
        console.warn("Payment initiation failed, falling back to COD:", payErr);
        toast.success(`Order ${orderNumber} placed! (Cash on Delivery)`);
      }

      setCart([]);
      setShowCart(false);
      setCheckoutStep("cart");
      setDeliveryAddress("");
      setOrderNotes("");
      setNeedLabor(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setPlacingOrder(false);
    }
  };

  // Build professional portal cards - only show cards relevant to the user
  const professionalPortals = [];

  // If user has a professional role, only show their portal
  if (hasProfessionalRole) {
    if (roles.includes("merchant" as any)) {
      professionalPortals.push({ title: "Merchant Portal", desc: "Manage your shop, billing & inventory", icon: Store, route: "/merchant", color: "text-portal-merchant" });
    }
    if (roles.includes("labor" as any)) {
      professionalPortals.push({ title: "Labor Portal", desc: "Manage jobs & grow your services", icon: Wrench, route: "/labor", color: "text-portal-labor" });
    }
    if (roles.includes("transportation" as any)) {
      professionalPortals.push({ title: "Transport Hub", desc: "Rides, deliveries & fleet management", icon: Truck, route: "/transportation", color: "text-portal-transportation" });
    }
  }

  // Employee portal only for @citylinks.in emails or users with employee role
  if (isStaffEmail || hasEmployeeRole) {
    professionalPortals.push({ title: "Employee Portal", desc: "Operations & management dashboard", icon: Shield, route: "/employee", color: "text-portal-employee" });
  }

  const portalGridClass = professionalPortals.length === 1
    ? "grid-cols-1"
    : professionalPortals.length === 2
      ? "grid-cols-1 sm:grid-cols-2"
      : "grid-cols-1 sm:grid-cols-3";

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar searchQuery={searchQuery} onSearchChange={setSearchQuery} cartCount={cart.reduce((s, i) => s + i.quantity, 0)} onCartClick={() => { setShowCart(true); setCheckoutStep("cart"); }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        {/* Inline search results when query >= 2 chars */}
        {searchQuery.trim().length >= 2 ? (
          <div className="py-6 space-y-6">
            {!hasSearchResults && (
              <div className="text-center py-12">
                <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <h3 className="font-semibold text-foreground mb-1">No results for "{searchQuery}"</h3>
                <p className="text-sm text-muted-foreground">Try different keywords</p>
              </div>
            )}
            {searchProducts && searchProducts.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-primary" /> Products ({searchProducts.length})
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {searchProducts.map((product, i) => {
                    const inCart = cart.find((c) => c.id === product.id);
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        className="glass rounded-2xl p-4 space-y-2"
                      >
                        <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{getMerchantName(product.merchant_id)}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-primary">₹{Number(product.price)}</span>
                          <span className="text-xs text-muted-foreground">/{product.unit}</span>
                        </div>
                        {inCart ? (
                          <div className="flex items-center justify-center gap-3">
                            <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => updateQty(product.id, -1)}><Minus className="w-3 h-3" /></Button>
                            <span className="text-sm font-bold w-6 text-center">{inCart.quantity}</span>
                            <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => updateQty(product.id, 1)}><Plus className="w-3 h-3" /></Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={() => addToCart(product)}>
                            <Plus className="w-3 h-3" /> Add to Cart
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </section>
            )}
            {searchShops && searchShops.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <Store className="w-5 h-5 text-portal-merchant" /> Shops ({searchShops.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchShops.map((shop, i) => (
                    <motion.div
                      key={shop.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer flex items-center gap-3"
                      onClick={() => navigate(`/shop/${shop.id}`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-portal-merchant/10 flex items-center justify-center">
                        <Store className="w-5 h-5 text-portal-merchant" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{shop.business_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{shop.business_type} {shop.city ? `• ${shop.city}` : ""}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
            {searchServices && searchServices.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-portal-labor" /> Services ({searchServices.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {searchServices.map((svc, i) => (
                    <motion.div
                      key={svc.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="glass rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer flex items-center gap-3"
                      onClick={() => navigate(`/services?category=${svc.category.toLowerCase()}`)}
                    >
                      <div className="w-10 h-10 rounded-xl bg-portal-labor/10 flex items-center justify-center">
                        <Wrench className="w-5 h-5 text-portal-labor" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">{svc.service_name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{svc.category}</p>
                      </div>
                      {svc.hourly_rate && <span className="text-sm font-bold text-portal-labor">₹{Number(svc.hourly_rate)}/hr</span>}
                    </motion.div>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <>
            {/* Hero section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="pt-6 pb-6 sm:pt-10 sm:pb-8"
            >
              <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-2">
                What do you need <span className="text-gradient-hero">today</span>?
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Services, products, and more — all from your neighbourhood
              </p>
            </motion.div>
            {/* Quick actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-10"
            >
              {quickActions.map((action) => (
                <motion.div
                  key={action.label}
                  whileHover={{ y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (action.action === "shops") navigate("/shops");
                    if (action.action === "services") navigate("/services");
                    if (action.action === "transport") navigate("/book-transport");
                    if (action.action === "deals") navigate("/deals");
                    if (action.action === "digital") navigate("/digital-services");
                  }}
                  className="glass rounded-2xl p-4 cursor-pointer group transition-all duration-200 hover:shadow-lg"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3 group-hover:bg-primary/20 transition-colors">
                    <action.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-sm text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
                </motion.div>
              ))}
            </motion.div>

            {/* Online Products from Merchants */}
            {products && products.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="mb-10"
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                    <ShoppingCart className="w-5 h-5 inline mr-2 text-primary" />
                    Shop Online
                  </h2>
                  {cart.length > 0 && (
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => { setShowCart(true); setCheckoutStep("cart"); }}
                    >
                      <ShoppingCart className="w-4 h-4" />
                      Cart ({cart.reduce((s, i) => s + i.quantity, 0)}) — ₹{cartTotal}
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {products.map((product, i) => {
                    const inCart = cart.find((c) => c.id === product.id);
                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="glass rounded-2xl p-4 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{getMerchantName(product.merchant_id)}</p>
                          </div>
                        </div>
                        {product.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                        )}
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-bold text-sm text-primary">₹{Number(product.price).toLocaleString()}</span>
                          <span className="text-xs text-muted-foreground">/{product.unit}</span>
                        </div>
                        {inCart ? (
                          <div className="flex items-center justify-center gap-3 pt-1">
                            <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => updateQty(product.id, -1)}>
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="text-sm font-bold text-foreground w-6 text-center">{inCart.quantity}</span>
                            <Button size="icon" variant="outline" className="w-7 h-7" onClick={() => updateQty(product.id, 1)}>
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" className="w-full gap-1 text-xs" onClick={() => addToCart(product)}>
                            <Plus className="w-3 h-3" /> Add to Cart
                          </Button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </motion.section>
            )}

            {/* Services section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Services at your doorstep
                </h2>
                <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs" onClick={() => navigate("/services")}>
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="relative">
                <div className="hidden sm:block pointer-events-none absolute bottom-4 left-1/4 top-4 w-px -translate-x-1/2 bg-border/40" />
                <div className="hidden sm:block pointer-events-none absolute bottom-4 left-3/4 top-4 w-px -translate-x-1/2 bg-border/40" />

                <div className="grid grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-4">
                  {serviceTiles.map((cat, index) => (
                    <motion.div
                      key={cat.name}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.04 + 0.3 }}
                      whileHover={{ y: -4 }}
                      onClick={() => {
                        const catLower = cat.name.toLowerCase();
                        if (catLower === "transport" || catLower === "moving") {
                          navigate("/book-transport");
                        } else {
                          navigate(`/services?category=${catLower}`);
                        }
                      }}
                      className="flex min-w-0 flex-col items-center gap-2 text-center cursor-pointer group"
                    >
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${cat.color} transition-all group-hover:scale-110 sm:h-16 sm:w-16`}>
                        <cat.icon className="w-5 h-5 sm:w-7 sm:h-7" />
                      </div>
                      <span className="text-[10px] font-medium leading-tight text-foreground sm:text-xs">{cat.name}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>

            {/* Shop categories */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  Shop by category
                </h2>
                <Button variant="ghost" size="sm" className="gap-1 text-primary text-xs" onClick={() => navigate("/shops")}>
                  View All <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shopCategories.map((cat, i) => (
                  <motion.div
                    key={cat.name}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 + 0.35 }}
                    whileHover={{ y: -4 }}
                    onClick={() => navigate("/shops")}
                    className="glass rounded-2xl p-4 flex items-center gap-3 cursor-pointer group hover:shadow-lg transition-all"
                  >
                    <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center flex-shrink-0`}>
                      <cat.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">Explore →</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.section>

            {/* Featured / Ads section */}
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  <Sparkles className="w-5 h-5 inline mr-2 text-primary" />
                  Featured
                </h2>
                {totalFeaturedPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={featuredPage <= 1}
                      onClick={() => setFeaturedPage((p) => Math.max(1, p - 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-border/60 bg-background/80 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Previous featured page"
                    >
                      <ChevronLeft className="w-4 h-4 text-foreground" />
                    </button>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground">
                      {featuredPage} / {totalFeaturedPages}
                    </span>
                    <button
                      type="button"
                      disabled={featuredPage >= totalFeaturedPages}
                      onClick={() => setFeaturedPage((p) => Math.min(totalFeaturedPages, p + 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-border/60 bg-background/80 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Next featured page"
                    >
                      <ChevronRight className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredAds.length > 0
                  ? (paginatedFeatured as FeaturedAd[]).map((ad, i) => (
                      <motion.div
                        key={ad.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 + 0.1 }}
                        whileHover={{ y: -4 }}
                        onClick={() => handleDiscoveryNavigation(ad.link_url)}
                        className="glass rounded-2xl p-5 cursor-pointer group hover:shadow-lg transition-all border border-primary/10"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-3xl">{ad.image_url ? "📢" : "⭐"}</span>
                          <Badge className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20">
                            Featured
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-sm text-foreground mb-1">{ad.title}</h3>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{ad.description || ad.category}</p>
                      </motion.div>
                    ))
                  : (paginatedFeatured as typeof featuredServices).map((service, i) => (
                      <motion.div
                        key={service.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08 + 0.1 }}
                        whileHover={{ y: -4 }}
                        className="glass rounded-2xl p-5 cursor-pointer group hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <span className="text-3xl">{service.image}</span>
                          <Badge variant="secondary" className="text-[10px] font-medium">
                            {service.tag}
                          </Badge>
                        </div>
                        <h3 className="font-semibold text-sm text-foreground mb-1">{service.name}</h3>
                        <p className="text-xs text-muted-foreground mb-3">{service.provider}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-xs font-semibold text-foreground">{service.rating}</span>
                            <span className="text-xs text-muted-foreground">({service.reviews})</span>
                          </div>
                          <span className="font-bold text-sm text-primary">{service.price}</span>
                        </div>
                      </motion.div>
                    ))}
              </div>

              {totalFeaturedPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  {Array.from({ length: totalFeaturedPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setFeaturedPage(idx + 1)}
                      className={`h-2 rounded-full transition-all ${
                        featuredPage === idx + 1 ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/30"
                      }`}
                      aria-label={`Go to featured page ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </motion.section>

            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.45 }}
              className="mb-10"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground">
                  <TrendingUp className="w-5 h-5 inline mr-2 text-primary" />
                  Popular near you
                </h2>
                {totalPopularPages > 1 && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={popularPage <= 1}
                      onClick={() => setPopularPage((p) => Math.max(1, p - 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-border/60 bg-background/80 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Previous popular page"
                    >
                      <ChevronLeft className="w-4 h-4 text-foreground" />
                    </button>
                    <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground">
                      {popularPage} / {totalPopularPages}
                    </span>
                    <button
                      type="button"
                      disabled={popularPage >= totalPopularPages}
                      onClick={() => setPopularPage((p) => Math.min(totalPopularPages, p + 1))}
                      className="w-8 h-8 rounded-full flex items-center justify-center border border-border/60 bg-background/80 hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      aria-label="Next popular page"
                    >
                      <ChevronRight className="w-4 h-4 text-foreground" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {paginatedPopular.map((item, index) => {
                  const Icon = item.entity_type === "transport"
                    ? Truck
                    : item.entity_type === "service"
                      ? Wrench
                      : item.entity_type === "shop"
                        ? Store
                        : ShoppingBag;

                  return (
                    <motion.div
                      key={`${item.entity_type}-${item.entity_id}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 + 0.1 }}
                      whileHover={{ y: -4 }}
                      onClick={() => handleDiscoveryNavigation(item.link_url)}
                      className="glass rounded-2xl p-5 cursor-pointer group hover:shadow-lg transition-all"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <Icon className="h-5 w-5" />
                        </div>
                        <Badge variant="secondary" className="text-[10px] font-medium">
                          {item.badge}
                        </Badge>
                      </div>

                      <h3 className="mb-1 text-sm font-semibold text-foreground">{item.title}</h3>
                      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{item.subtitle}</p>

                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-medium text-primary">{item.price_label || `${item.popularity} orders`}</span>
                        <span className="text-muted-foreground">{item.popularity > 0 ? `${item.popularity} orders` : "Trending"}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {totalPopularPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4">
                  {Array.from({ length: totalPopularPages }).map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setPopularPage(idx + 1)}
                      className={`h-2 rounded-full transition-all ${
                        popularPage === idx + 1 ? "w-6 bg-primary" : "w-2 bg-muted hover:bg-muted-foreground/30"
                      }`}
                      aria-label={`Go to popular page ${idx + 1}`}
                    />
                  ))}
                </div>
              )}
            </motion.section>

            {/* Portal shortcuts for users who already have professional roles */}
            {!authLoading && professionalPortals.length > 0 && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="mb-10"
              >
                <h2 className="font-display text-lg sm:text-xl font-bold text-foreground mb-4">
                  Your Portals
                </h2>
                <div className={`grid gap-3 ${portalGridClass}`}>
                  {professionalPortals.map((portal) => (
                    <motion.div
                      key={portal.title}
                      whileHover={{ y: -3 }}
                      onClick={() => navigate(portal.route)}
                      className="glass rounded-2xl p-4 flex items-center gap-4 cursor-pointer group hover:shadow-lg transition-all"
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                        <portal.icon className={`w-5 h-5 ${portal.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{portal.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{portal.desc}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            )}

            {/* Footer */}
            <div className="text-center pt-6 pb-4">
              <p className="text-xs text-muted-foreground">
                Powered by <span className="font-semibold text-foreground">CityLinks</span> — Your Hyperlocal Partner
              </p>
            </div>
          </>
        )}
      </div>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && !showCart && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <Button
              size="lg"
              className="gap-2 rounded-full shadow-lg px-6"
              onClick={() => { setShowCart(true); setCheckoutStep("cart"); }}
            >
              <ShoppingCart className="w-5 h-5" />
              View Cart ({cart.reduce((s, i) => s + i.quantity, 0)} items) — ₹{cartTotal}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart & Checkout Dialog */}
      <Dialog open={showCart} onOpenChange={(open) => { setShowCart(open); if (!open) setCheckoutStep("cart"); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">
              {checkoutStep === "cart" && "Your Cart"}
              {checkoutStep === "transport" && "Select Delivery"}
              {checkoutStep === "labor" && "Need Help? (Optional)"}
              {checkoutStep === "confirm" && "Order Summary"}
            </DialogTitle>
          </DialogHeader>

          {/* Cart Step */}
          {checkoutStep === "cart" && (
            <div className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Your cart is empty</p>
              ) : (
                <>
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 rounded-xl bg-accent/50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.merchant_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => updateQty(item.id, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-bold w-5 text-center">{item.quantity}</span>
                        <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => updateQty(item.id, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium text-foreground w-16 text-right">₹{(item.price * item.quantity).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-medium text-foreground">Subtotal</span>
                    <span className="font-bold text-foreground">₹{cartTotal.toLocaleString()}</span>
                  </div>
                </>
              )}
              <DialogFooter>
                <Button variant="ghost" onClick={() => setShowCart(false)}>Continue Shopping</Button>
                <Button disabled={cart.length === 0} onClick={() => setCheckoutStep("transport")} className="gap-1">
                  Choose Delivery <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Transport Step */}
          {checkoutStep === "transport" && (
            <div className="space-y-4">
              <div>
                <Label className="text-foreground font-medium mb-2 block">Delivery Address *</Label>
                <Textarea
                  placeholder="Enter your full delivery address..."
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  maxLength={300}
                />
              </div>

              <div>
                <Label className="text-foreground font-medium mb-3 block">Select Transport Type</Label>
                <RadioGroup value={selectedTransport} onValueChange={setSelectedTransport} className="space-y-2">
                  {transportOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedTransport === opt.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border/50 hover:border-border hover:bg-accent/30"
                        }`}
                    >
                      <RadioGroupItem value={opt.id} className="shrink-0" />
                      <div className="w-10 h-10 rounded-xl bg-portal-transportation/10 flex items-center justify-center shrink-0">
                        <opt.icon className="w-5 h-5 text-portal-transportation" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-foreground">{opt.name}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc} • {opt.capacity}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-primary">{opt.price}</p>
                        <p className="text-xs text-muted-foreground">{opt.eta}</p>
                      </div>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setCheckoutStep("cart")}>Back</Button>
                <Button onClick={() => setCheckoutStep("labor")} disabled={!deliveryAddress.trim()} className="gap-1">
                  Next <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Labor Step */}
          {checkoutStep === "labor" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Need someone to help with installation, setup, or carrying? Select a service below or skip.
              </p>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/50">
                <input
                  type="checkbox"
                  checked={needLabor}
                  onChange={(e) => setNeedLabor(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Yes, I need labor help</p>
                  <p className="text-xs text-muted-foreground">Browse available service providers</p>
                </div>
              </div>

              {needLabor && laborServices && laborServices.length > 0 && (
                <div className="space-y-2">
                  {laborServices.map((svc) => (
                    <div key={svc.id} className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-portal-labor/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-portal-labor" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{svc.service_name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{svc.category}</p>
                        </div>
                      </div>
                      {svc.hourly_rate && (
                        <span className="text-sm font-medium text-portal-labor">₹{Number(svc.hourly_rate)}/hr</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {needLabor && (!laborServices || laborServices.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">No labor services available currently.</p>
              )}

              <div>
                <Label className="text-foreground text-sm mb-1.5 block">Order Notes (optional)</Label>
                <Textarea
                  placeholder="Any special instructions for delivery or labor..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  maxLength={500}
                />
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setCheckoutStep("transport")}>Back</Button>
                <Button onClick={() => setCheckoutStep("confirm")} className="gap-1">
                  Review Order <ArrowRight className="w-4 h-4" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* Confirm Step */}
          {checkoutStep === "confirm" && (
            <div className="space-y-4">
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.name} × {item.quantity}</span>
                    <span className="text-foreground font-medium">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                <div className="border-t border-border pt-2 flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">₹{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transport ({selectedTransportOption?.name})</span>
                  <span className="text-foreground">{selectedTransportOption?.price}</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between">
                  <span className="font-bold text-foreground">Total</span>
                  <span className="font-bold text-primary text-lg">₹{(cartTotal + transportPrice).toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="p-3 rounded-xl bg-accent/50">
                  <span className="text-muted-foreground">Delivery to</span>
                  <p className="font-medium text-foreground">{deliveryAddress}</p>
                </div>
                <div className="p-3 rounded-xl bg-accent/50 flex items-center gap-3">
                  {selectedTransportOption && <selectedTransportOption.icon className="w-5 h-5 text-portal-transportation" />}
                  <div>
                    <p className="font-medium text-foreground">{selectedTransportOption?.name}</p>
                    <p className="text-xs text-muted-foreground">ETA: {selectedTransportOption?.eta}</p>
                  </div>
                </div>
                {needLabor && (
                  <div className="p-3 rounded-xl bg-portal-labor/5 flex items-center gap-2">
                    <Users className="w-4 h-4 text-portal-labor" />
                    <span className="text-foreground text-sm">Labor assistance requested</span>
                  </div>
                )}
                {orderNotes && (
                  <div className="p-3 rounded-xl bg-accent/50">
                    <span className="text-muted-foreground">Notes</span>
                    <p className="text-foreground">{orderNotes}</p>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setCheckoutStep("labor")}>Back</Button>
                <Button onClick={handlePlaceOrder} disabled={placingOrder} className="gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> {placingOrder ? "Placing..." : "Pay & Place Order (UPI)"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CustomerDashboard;
