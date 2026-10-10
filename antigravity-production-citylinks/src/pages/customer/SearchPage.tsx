import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Search,
  X,
  Store,
  ShoppingBag,
  Wrench,
  MapPin,
  ArrowLeft,
  Star,
  Plus,
  Minus,
  ShoppingCart,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";

const SearchPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [isSearching, setIsSearching] = useState(!!initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSearching) {
      inputRef.current?.focus();
    }
  }, []);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim()) {
      setIsSearching(true);
      setSearchParams({ q: value });
    } else {
      setIsSearching(false);
      setSearchParams({});
    }
  };

  const clearSearch = () => {
    setQuery("");
    setIsSearching(false);
    setSearchParams({});
    inputRef.current?.focus();
  };

  // Search products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["search-products", query],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_products")
        .select("id, name, price, description, unit, stock_quantity, merchant_id, image_url")
        .eq("is_online", true)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .ilike("name", `%${query}%`)
        .limit(50);
      return data || [];
    },
    enabled: query.trim().length >= 2,
  });

  // Search merchants/shops
  const { data: shops, isLoading: shopsLoading } = useQuery({
    queryKey: ["search-shops", query],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchants")
        .select("id, business_name, business_type, address, city")
        .eq("approval_status", "approved")
        .eq("onboarding_complete", true)
        .or(`business_name.ilike.%${query}%,business_type.ilike.%${query}%,address.ilike.%${query}%`)
        .limit(20);
      return data || [];
    },
    enabled: query.trim().length >= 2,
  });

  // Search labor services
  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ["search-services", query],
    queryFn: async () => {
      const { data } = await supabase
        .from("labor_services")
        .select("id, service_name, category, hourly_rate, labor_id, description")
        .eq("is_active", true)
        .or(`service_name.ilike.%${query}%,category.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(20);
      return data || [];
    },
    enabled: query.trim().length >= 2,
  });

  // Fetch merchant names for products
  const { data: merchants } = useQuery({
    queryKey: ["merchants-names"],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchants")
        .select("id, business_name")
        .eq("approval_status", "approved");
      return data || [];
    },
  });

  const getMerchantName = (id: string) =>
    merchants?.find((m) => m.id === id)?.business_name || "Local Shop";

  const isLoading = productsLoading || shopsLoading || servicesLoading;
  const hasResults =
    (products && products.length > 0) ||
    (shops && shops.length > 0) ||
    (services && services.length > 0);
  const hasSearched = query.trim().length >= 2;

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />

      <AnimatePresence mode="wait">
        {!isSearching ? (
          /* Centered hero search */
          <motion.div
            key="hero-search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -50 }}
            className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3">
                Search <span className="text-gradient-hero">CityLinks</span>
              </h1>
              <p className="text-muted-foreground text-sm sm:text-base">
                Products, shops, services — find anything in your neighbourhood
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="w-full max-w-2xl"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-5 top-1/2 z-10 -translate-y-1/2 w-6 h-6 text-primary" />
                <Input
                  ref={inputRef}
                  placeholder="Search for products, shops, services..."
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && query.trim() && handleSearch(query)}
                  className="pl-14 pr-5 h-14 sm:h-16 text-base sm:text-lg glass-strong rounded-2xl border-border/30 focus-visible:ring-primary/30 shadow-lg"
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-6"
            >
              <Button
                variant="ghost"
                onClick={() => navigate("/")}
                className="gap-2 text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          /* Results view with search bar at top */
          <motion.div
            key="results-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="relative z-10"
          >
            {/* Top search bar */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="sticky top-0 z-50 glass-strong"
            >
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-3 h-14 sm:h-16">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => navigate("/")}
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="relative flex-1 max-w-2xl">
                  <Search className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 w-4 h-4 text-primary" />
                  <Input
                    ref={inputRef}
                    value={query}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search products, shops, services..."
                    className="pl-10 pr-10 h-10 rounded-xl bg-background/50 border-border/30"
                    autoFocus
                  />
                  {query && (
                    <button
                      onClick={clearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Results */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {isLoading && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="glass rounded-2xl p-4 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/2 mb-3" />
                      <div className="h-8 bg-muted rounded" />
                    </div>
                  ))}
                </div>
              )}

              {!isLoading && hasSearched && !hasResults && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <h3 className="font-semibold text-foreground mb-1">No results for "{query}"</h3>
                  <p className="text-sm text-muted-foreground">
                    Try different keywords or browse categories
                  </p>
                </motion.div>
              )}

              {!isLoading && hasResults && (
                <div className="space-y-8">
                  {/* Products */}
                  {products && products.length > 0 && (
                    <section>
                      <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        Products ({products.length})
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {products.map((product, i) => (
                          <motion.div
                            key={product.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.03 }}
                            className="glass rounded-2xl p-4 space-y-2 hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => navigate(`/shop/${product.merchant_id}`)}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm text-foreground truncate">
                                {product.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {getMerchantName(product.merchant_id)}
                              </p>
                            </div>
                            {product.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {product.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between pt-1">
                              <span className="font-bold text-sm text-primary">
                                ₹{Number(product.price).toLocaleString()}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                /{product.unit}
                              </span>
                            </div>
                            <Badge variant="secondary" className="text-[10px]">
                              {product.stock_quantity} in stock
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Shops */}
                  {shops && shops.length > 0 && (
                    <section>
                      <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <Store className="w-5 h-5 text-portal-merchant" />
                        Shops ({shops.length})
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {shops.map((shop, i) => (
                          <motion.div
                            key={shop.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            whileHover={{ y: -2 }}
                            onClick={() => navigate(`/shop/${shop.id}`)}
                            className="glass rounded-2xl p-4 cursor-pointer hover:shadow-lg transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-portal-merchant/10 flex items-center justify-center shrink-0">
                                <Store className="w-5 h-5 text-portal-merchant" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                  {shop.business_name}
                                </h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="secondary" className="text-[10px] capitalize">
                                    {shop.business_type}
                                  </Badge>
                                  {shop.city && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                      <MapPin className="w-3 h-3" /> {shop.city}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}

                  {/* Services */}
                  {services && services.length > 0 && (
                    <section>
                      <h2 className="font-display text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-portal-labor" />
                        Services ({services.length})
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {services.map((svc, i) => (
                          <motion.div
                            key={svc.id}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="glass rounded-2xl p-4 hover:shadow-lg transition-all cursor-pointer"
                            onClick={() => navigate("/services")}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-xl bg-portal-labor/10 flex items-center justify-center shrink-0">
                                <Wrench className="w-5 h-5 text-portal-labor" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-sm text-foreground truncate">
                                  {svc.service_name}
                                </h3>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {svc.category}
                                </p>
                              </div>
                              {svc.hourly_rate && (
                                <span className="text-sm font-bold text-portal-labor shrink-0">
                                  ₹{Number(svc.hourly_rate)}/hr
                                </span>
                              )}
                            </div>
                            {svc.description && (
                              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                                {svc.description}
                              </p>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    </section>
                  )}
                </div>
              )}

              {!isLoading && !hasSearched && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-20"
                >
                  <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-40" />
                  <h3 className="font-semibold text-foreground mb-1">Start typing to search</h3>
                  <p className="text-sm text-muted-foreground">
                    Search for products, shops, or services
                  </p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchPage;
