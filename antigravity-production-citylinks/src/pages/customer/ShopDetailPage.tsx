import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Store,
  MapPin,
  Phone,
  Mail,
  Plus,
  Minus,
  ShoppingCart,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  merchant_name: string;
}

const ShopDetailPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const { data: merchant, isLoading: merchantLoading } = useQuery({
    queryKey: ["merchant-detail", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchants")
        .select("id, business_name, business_type, address, city, district, state, pincode, phone, email")
        .eq("id", id!)
        .eq("approval_status", "approved")
        .single();
      return data;
    },
    enabled: !!id,
  });

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["shop-products", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("merchant_products")
        .select("id, name, price, description, unit, stock_quantity, image_url")
        .eq("merchant_id", id!)
        .eq("is_online", true)
        .eq("is_active", true)
        .gt("stock_quantity", 0);
      return data || [];
    },
    enabled: !!id,
  });

  const filtered = (products || []).filter((p) =>
    !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { id: product.id, name: product.name, price: Number(product.price), quantity: 1, merchant_name: merchant?.business_name || "Shop" }];
    });
    toast.success(`${product.name} added to cart`);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.id === productId ? { ...i, quantity: i.quantity + delta } : i).filter((i) => i.quantity > 0));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const isLoading = merchantLoading || productsLoading;

  if (!isLoading && !merchant) {
    return (
      <div className="min-h-screen mesh-gradient relative">
        <FloatingOrbs />
        <CustomerNavbar />
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-20 text-center">
          <Store className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
          <h2 className="text-lg font-semibold text-foreground mb-2">Shop not found</h2>
          <Button variant="ghost" onClick={() => navigate("/shops")}>Browse other shops</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-8 pb-6">
          <Button variant="ghost" className="gap-2 mb-4 text-muted-foreground" onClick={() => navigate("/shops")}>
            <ArrowLeft className="w-4 h-4" /> Back to Shops
          </Button>

          {isLoading ? (
            <div className="glass rounded-2xl p-6 animate-pulse h-32" />
          ) : merchant && (
            <div className="glass rounded-2xl p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Store className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground">{merchant.business_name}</h1>
                  <Badge variant="secondary" className="text-xs capitalize mt-1">{merchant.business_type}</Badge>
                  {merchant.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                      <MapPin className="w-3 h-3" />
                      {[merchant.address, merchant.city, merchant.district, merchant.state].filter(Boolean).join(", ")}
                      {merchant.pincode && ` - ${merchant.pincode}`}
                    </p>
                  )}
                  <div className="flex gap-4 mt-2">
                    {merchant.phone && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Phone className="w-3 h-3" /> {merchant.phone}
                      </span>
                    )}
                    {merchant.email && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {merchant.email}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Product search */}
          <div className="relative max-w-md mb-6">
            <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 glass-strong rounded-xl border-border/30"
            />
          </div>
        </motion.div>

        {productsLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass rounded-2xl p-4 animate-pulse h-36" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <Package className="w-12 h-12 mx-auto text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No products available</h3>
            <p className="text-sm text-muted-foreground">This shop hasn't listed any online products yet</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map((product, i) => {
              const inCart = cart.find((c) => c.id === product.id);
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass rounded-2xl p-4 space-y-2"
                >
                  <div>
                    <p className="font-semibold text-sm text-foreground truncate">{product.name}</p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-primary">₹{Number(product.price).toLocaleString()}</span>
                    <span className="text-xs text-muted-foreground">/{product.unit}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Stock: {product.stock_quantity}</p>
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
        )}
      </div>

      {/* Floating cart */}
      {cartCount > 0 && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <Button size="lg" className="gap-2 rounded-full shadow-lg px-6" onClick={() => navigate("/")}>
            <ShoppingCart className="w-5 h-5" />
            Cart ({cartCount} items) — ₹{cartTotal.toLocaleString()}
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default ShopDetailPage;
