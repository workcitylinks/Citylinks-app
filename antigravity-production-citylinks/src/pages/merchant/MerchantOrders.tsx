import { useState } from "react";
import { useMerchant } from "@/hooks/useMerchant";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import MerchantLayout from "@/components/merchant/MerchantLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShoppingBag, Clock, CheckCircle2, XCircle, Phone, MapPin, Package } from "lucide-react";

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  merchant_status: string;
  created_at: string;
  orders: {
    order_number: string;
    delivery_address: string;
    profiles: {
      full_name: string;
      phone: string;
    }
  }
}

const MerchantOrders = () => {
  const { merchant } = useMerchant();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["merchant-orders", merchant?.id],
    queryFn: async () => {
      const { data, error } = await (supabase
        .from("order_items")
        .select("*") as any)
        .eq("merchant_id", merchant!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch related order and profile data
      const enriched = await Promise.all((data || []).map(async (item: any) => {
        const { data: order } = await supabase.from("orders").select("order_number, delivery_address, customer_id").eq("id", item.order_id).single();
        let profile = { full_name: "Unknown", phone: null };
        if (order?.customer_id) {
          const { data: p } = await supabase.from("profiles").select("full_name, phone").eq("id", order.customer_id).single();
          if (p) profile = p as any;
        }
        return {
          ...item,
          orders: {
            order_number: order?.order_number || "N/A",
            delivery_address: order?.delivery_address || "N/A",
            profiles: profile,
          },
        };
      }));
      
      return enriched as OrderItem[];
    },
    enabled: !!merchant,
  });

  const handleUpdateStatus = async (itemId: string, status: "accepted" | "rejected") => {
    setProcessingId(itemId);
    try {
      const { error } = await supabase
        .from("order_items")
        .update({ merchant_status: status } as any)
        .eq("id", itemId);

      if (error) throw error;
      toast.success(`Order item ${status} successfully`);
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setProcessingId(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800 border-amber-200",
    accepted: "bg-emerald-100 text-emerald-800 border-emerald-200",
    rejected: "bg-red-100 text-red-800 border-red-200",
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Order Management</h1>
            <p className="text-sm text-muted-foreground">Review and process your product orders</p>
          </div>
          <Badge variant="outline" className="gap-1.5 py-1 px-3">
            <ShoppingBag className="w-3.5 h-3.5" />
            {orders?.length || 0} Total Items
          </Badge>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse glass h-32" />
            ))}
          </div>
        ) : !orders || orders.length === 0 ? (
          <Card className="glass border-dashed border-2">
            <CardContent className="p-12 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Package className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">No orders found yet.</p>
              <p className="text-xs text-muted-foreground max-w-xs">When customers buy your products, they will appear here for your approval.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {orders.map((item) => (
              <Card key={item.id} className="glass overflow-hidden hover:shadow-md transition-shadow">
                <CardContent className="p-0">
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:items-center">
                    {/* Product & Order Info */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                          #{item.orders.order_number}
                        </span>
                        <Badge className={`capitalize ${statusColors[item.merchant_status]}`}>
                          {item.merchant_status}
                        </Badge>
                      </div>
                      <h3 className="font-bold text-foreground text-lg">{item.product_name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">Qty: {item.quantity}</span>
                        <span>Total: ₹{item.total_price.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="flex-1 space-y-1 sm:border-l sm:pl-4 border-border/50">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer Details</p>
                      <p className="text-sm font-medium text-foreground">{item.orders.profiles.full_name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Phone className="w-3 h-3" /> {item.orders.profiles.phone || "No phone"}
                      </div>
                      <div className="flex items-start gap-2 text-xs text-muted-foreground max-w-xs">
                        <MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {item.orders.delivery_address}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 shrink-0">
                      {item.merchant_status === "pending" ? (
                        <>
                          <Button 
                            size="sm" 
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 flex-1"
                            onClick={() => handleUpdateStatus(item.id, "accepted")}
                            disabled={!!processingId}
                          >
                            <CheckCircle2 className="w-4 h-4" /> Accept
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            className="gap-1.5 flex-1"
                            onClick={() => handleUpdateStatus(item.id, "rejected")}
                            disabled={!!processingId}
                          >
                            <XCircle className="w-4 h-4" /> Reject
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3.5 h-3.5" />
                          Ordered on {new Date(item.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MerchantLayout>
  );
};

export default MerchantOrders;
