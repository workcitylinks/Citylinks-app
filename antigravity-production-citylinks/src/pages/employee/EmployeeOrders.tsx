import { useEffect, useState } from "react";
import EmployeeLayout from "@/components/employee/EmployeeLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Package, Truck, Clock, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp, Users, Bike, Car } from "lucide-react";

interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  subtotal: number;
  transport_type: string;
  transport_price: number;
  total_amount: number;
  delivery_address: string;
  notes: string | null;
  need_labor: boolean;
  created_at: string;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  merchant_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

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

const statusFlow = ["pending", "confirmed", "in_transit", "delivered"];

const EmployeeOrders = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [customerProfiles, setCustomerProfiles] = useState<Record<string, string>>({});

  const fetchOrders = async () => {
    setLoading(true);
    const [ordersRes, itemsRes] = await Promise.all([
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
      supabase.from("order_items").select("*"),
    ]);
    
    if (ordersRes.data) {
      setOrders(ordersRes.data as Order[]);
      // Fetch customer profiles
      const customerIds = [...new Set(ordersRes.data.map(o => o.customer_id))];
      if (customerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, phone")
          .in("id", customerIds);
        if (profiles) {
          const map: Record<string, string> = {};
          profiles.forEach(p => { map[p.id] = p.full_name || "Unknown Customer"; });
          setCustomerProfiles(map);
        }
      }
    }
    if (itemsRes.data) setOrderItems(itemsRes.data as OrderItem[]);
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    if (!user) return;
    setUpdatingId(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Order updated to ${newStatus.replace("_", " ")}`);
      // Update local state
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      // Log the action
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        action: "order_status_updated",
        entity_type: "order",
        entity_id: orderId,
        details: { new_status: newStatus },
      });
    }
    setUpdatingId(null);
  };

  const getItemsForOrder = (orderId: string) =>
    orderItems.filter(item => item.order_id === orderId);

  const filteredOrders = filterStatus === "all" 
    ? orders 
    : orders.filter(o => o.status === filterStatus);

  const getNextStatus = (current: string) => {
    const idx = statusFlow.indexOf(current);
    return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  };

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Order Management</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {orders.length} total orders • {orders.filter(o => o.status === "pending").length} pending
            </p>
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="in_transit">In Transit</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Loading orders...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card className="glass">
            <CardContent className="p-8 text-center text-muted-foreground">
              No orders found.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => {
              const status = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              const TransportIcon = transportIcons[order.transport_type] || Truck;
              const isExpanded = expandedOrder === order.id;
              const items = getItemsForOrder(order.id);
              const nextStatus = getNextStatus(order.status);

              return (
                <Card key={order.id} className="glass overflow-hidden">
                  <CardContent className="p-0">
                    <div
                      className="p-4 cursor-pointer hover:bg-accent/30 transition-colors"
                      onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <p className="font-display font-bold text-foreground text-sm">
                            {order.order_number}
                          </p>
                          <Badge className={status.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3">
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
                        <span>{customerProfiles[order.customer_id] || "Customer"}</span>
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
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
                      <div className="border-t border-border/50 p-4 space-y-4">
                        {/* Items */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Items</p>
                          {items.map((item) => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-foreground">
                                {item.product_name} × {item.quantity}
                                <span className="text-muted-foreground ml-1">({item.merchant_name})</span>
                              </span>
                              <span className="text-foreground font-medium">
                                ₹{Number(item.total_price).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>

                        {/* Delivery info */}
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

                        {/* Status update actions */}
                        <div className="flex items-center gap-2 flex-wrap pt-2">
                          {nextStatus && (
                            <Button
                              size="sm"
                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, nextStatus); }}
                              disabled={updatingId === order.id}
                              className="gap-1.5"
                            >
                              {updatingId === order.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              Mark as {nextStatus.replace("_", " ")}
                            </Button>
                          )}
                          {order.status !== "cancelled" && order.status !== "delivered" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={(e) => { e.stopPropagation(); handleStatusUpdate(order.id, "cancelled"); }}
                              disabled={updatingId === order.id}
                              className="gap-1.5"
                            >
                              <XCircle className="w-3 h-3" /> Cancel
                            </Button>
                          )}
                          {order.status === "delivered" && (
                            <Badge className="bg-emerald-500/15 text-emerald-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeOrders;
