import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import MerchantLayout from "@/components/merchant/MerchantLayout";
import { Card } from "@/components/ui/card";
import { IndianRupee, TrendingUp, ShoppingCart, ArrowUpRight, ArrowDownRight } from "lucide-react";

const MerchantAnalytics = () => {
  const { merchant } = useMerchant();

  const { data: analytics } = useQuery({
    queryKey: ["merchant-analytics", merchant?.id],
    queryFn: async () => {
      if (!merchant) return null;
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const monthAgo = new Date(now.getTime() - 30 * 86400000).toISOString();

      const [allBills, weekBills, monthBills, todayBills] = await Promise.all([
        supabase.from("bills").select("total_amount, payment_method, created_at").eq("merchant_id", merchant.id),
        supabase.from("bills").select("total_amount").eq("merchant_id", merchant.id).gte("created_at", weekAgo),
        supabase.from("bills").select("total_amount").eq("merchant_id", merchant.id).gte("created_at", monthAgo),
        supabase.from("bills").select("total_amount").eq("merchant_id", merchant.id).gte("created_at", today),
      ]);

      const sum = (arr: any[]) => arr.reduce((s, b) => s + Number(b.total_amount || 0), 0);
      const byMethod: Record<string, number> = {};
      (allBills.data || []).forEach((b) => {
        byMethod[b.payment_method] = (byMethod[b.payment_method] || 0) + Number(b.total_amount || 0);
      });

      return {
        totalRevenue: sum(allBills.data || []),
        totalBills: allBills.data?.length || 0,
        weekRevenue: sum(weekBills.data || []),
        monthRevenue: sum(monthBills.data || []),
        todayRevenue: sum(todayBills.data || []),
        todayBills: todayBills.data?.length || 0,
        byMethod,
      };
    },
    enabled: !!merchant,
  });

  const methodLabels: Record<string, string> = { cash: "Cash", upi: "UPI / QR", card: "Card", credit: "Credit" };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="glass p-4 space-y-1">
            <p className="text-sm text-muted-foreground">Today</p>
            <p className="text-2xl font-display font-bold text-foreground">₹{analytics?.todayRevenue?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">{analytics?.todayBills || 0} bills</p>
          </Card>
          <Card className="glass p-4 space-y-1">
            <p className="text-sm text-muted-foreground">This Week</p>
            <p className="text-2xl font-display font-bold text-foreground">₹{analytics?.weekRevenue?.toLocaleString() || 0}</p>
          </Card>
          <Card className="glass p-4 space-y-1">
            <p className="text-sm text-muted-foreground">This Month</p>
            <p className="text-2xl font-display font-bold text-foreground">₹{analytics?.monthRevenue?.toLocaleString() || 0}</p>
          </Card>
          <Card className="glass p-4 space-y-1">
            <p className="text-sm text-muted-foreground">All Time</p>
            <p className="text-2xl font-display font-bold text-portal-merchant">₹{analytics?.totalRevenue?.toLocaleString() || 0}</p>
            <p className="text-xs text-muted-foreground">{analytics?.totalBills || 0} total bills</p>
          </Card>
        </div>

        <Card className="glass p-5 space-y-3">
          <h2 className="font-display font-bold text-foreground">Revenue by Payment Method</h2>
          <div className="space-y-2">
            {analytics?.byMethod && Object.entries(analytics.byMethod).map(([method, amount]) => {
              const pct = analytics.totalRevenue ? Math.round((amount / analytics.totalRevenue) * 100) : 0;
              return (
                <div key={method} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{methodLabels[method] || method}</span>
                    <span className="text-muted-foreground">₹{amount.toLocaleString()} ({pct}%)</span>
                  </div>
                  <div className="h-2 rounded-full bg-accent overflow-hidden">
                    <div className="h-full rounded-full bg-portal-merchant transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {(!analytics?.byMethod || Object.keys(analytics.byMethod).length === 0) && (
              <p className="text-sm text-muted-foreground">No data yet</p>
            )}
          </div>
        </Card>
      </div>
    </MerchantLayout>
  );
};

export default MerchantAnalytics;
