import { useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Bike,
  Car,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import CustomerNavbar from "@/components/customer/CustomerNavbar";
import FloatingOrbs from "@/components/landing/FloatingOrbs";
import { useState } from "react";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: "Pending", color: "bg-yellow-500/15 text-yellow-600", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-500/15 text-blue-600", icon: Package },
  in_transit: { label: "In Transit", color: "bg-violet-500/15 text-violet-600", icon: Truck },
  delivered: { label: "Delivered", color: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-500/15 text-red-600", icon: XCircle },
};

const transportIcons: Record<string, any> = {
  scooty: Bike,
  auto: Car,
  tata_ace: Truck,
  pickup: Package,
};

const CustomerOrders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["customer-orders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: orderItems } = useQuery({
    queryKey: ["customer-order-items", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("order_items")
        .select("*");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Subscribe to real-time order status updates
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("customer-orders-realtime")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `customer_id=eq.${user.id}`,
        },
        (payload) => {
          // Invalidate query to refetch with new status
          queryClient.invalidateQueries({ queryKey: ["customer-orders", user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const getItemsForOrder = (orderId: string) =>
    orderItems?.filter((item) => item.order_id === orderId) || [];

  if (!user) {
    return (
      <div className="min-h-screen mesh-gradient flex items-center justify-center">
        <Card className="glass p-8 text-center">
          <p className="text-muted-foreground mb-4">Please sign in to view your orders</p>
          <Button onClick={() => navigate("/auth")}>Sign In</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen mesh-gradient relative">
      <FloatingOrbs />
      <CustomerNavbar />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-8 pb-6"
        >
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            My Orders
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Track and manage your purchases</p>
        </motion.div>

        <div className="space-y-3">
          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Loading orders...</p>
            </div>
          )}

          {!isLoading && (!orders || orders.length === 0) && (
            <div className="text-center py-16">
              <Package className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground font-medium">No orders yet</p>
              <p className="text-muted-foreground text-sm mt-1">Start shopping to see your orders here</p>
              <Button className="mt-4" onClick={() => navigate("/")}>Browse Products</Button>
            </div>
          )}

          {orders?.map((order, i) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const TransportIcon = transportIcons[order.transport_type] || Truck;
            const isExpanded = expandedOrder === order.id;
            const items = getItemsForOrder(order.id);

            return (
              <motion.div
                key={order.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card
                  className="glass overflow-hidden cursor-pointer"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-foreground text-sm">
                          {order.order_number}
                        </p>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">
                          ₹{Number(order.total_amount).toLocaleString()}
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <TransportIcon className="w-3 h-3" />
                        {order.transport_type.replace("_", " ")}
                      </span>
                      {order.need_labor && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" /> Labor
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      className="border-t border-border/50 p-4 space-y-3"
                    >
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</p>
                        {items.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-foreground">
                              {item.product_name} × {item.quantity}
                            </span>
                            <span className="text-foreground font-medium">
                              ₹{Number(item.total_price).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-border/30 pt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span>₹{Number(order.subtotal).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Transport</span>
                          <span>₹{Number(order.transport_price).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-foreground">Total</span>
                          <span className="text-primary">₹{Number(order.total_amount).toLocaleString()}</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-accent/50 text-sm">
                        <span className="text-muted-foreground text-xs">Delivery Address</span>
                        <p className="text-foreground">{order.delivery_address}</p>
                      </div>

                      {order.notes && (
                        <div className="p-3 rounded-xl bg-accent/50 text-sm">
                          <span className="text-muted-foreground text-xs">Notes</span>
                          <p className="text-foreground">{order.notes}</p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CustomerOrders;
