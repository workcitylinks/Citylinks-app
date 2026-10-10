import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import MerchantLayout from "@/components/merchant/MerchantLayout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Receipt } from "lucide-react";

const MerchantBills = () => {
  const { merchant } = useMerchant();

  const { data: bills, isLoading } = useQuery({
    queryKey: ["bills", merchant?.id],
    queryFn: async () => {
      if (!merchant) return [];
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("merchant_id", merchant.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchant,
  });

  const methodColor: Record<string, string> = {
    cash: "bg-portal-merchant/15 text-portal-merchant",
    upi: "bg-portal-customer/15 text-portal-customer",
    card: "bg-portal-labor/15 text-portal-labor",
    credit: "bg-portal-employee/15 text-portal-employee",
  };

  return (
    <MerchantLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Bills History</h1>

        <div className="space-y-3">
          {bills?.map((bill) => (
            <Card key={bill.id} className="glass p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-display font-bold text-foreground">{bill.bill_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(bill.created_at).toLocaleString()} {bill.customer_name && `• ${bill.customer_name}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={methodColor[bill.payment_method] || ""}>{bill.payment_method}</Badge>
                  <span className="font-display font-bold text-lg text-foreground">₹{Number(bill.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </Card>
          ))}
          {!isLoading && bills?.length === 0 && (
            <div className="text-center py-12">
              <Receipt className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No bills yet. Create your first bill!</p>
            </div>
          )}
        </div>
      </div>
    </MerchantLayout>
  );
};

export default MerchantBills;
