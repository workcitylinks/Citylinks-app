import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMerchant } from "@/hooks/useMerchant";
import MerchantLayout from "@/components/merchant/MerchantLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Minus, Trash2, Receipt, Search } from "lucide-react";

interface CartItem {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const MerchantBilling = () => {
  const { merchant } = useMerchant();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cart, setCart] = useState<CartItem[]>([]);

  // Custom item fields
  const [customName, setCustomName] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  const { data: products } = useQuery({
    queryKey: ["merchant-products", merchant?.id, search],
    queryFn: async () => {
      if (!merchant) return [];
      let q = supabase
        .from("merchant_products")
        .select("*")
        .eq("merchant_id", merchant.id)
        .eq("is_active", true)
        .order("name");
      if (search) q = q.ilike("name", `%${search}%`);
      const { data, error } = await q.limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!merchant,
  });

  const addToCart = (product: { id: string; name: string; price: number }) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product_id === product.id
            ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price }
            : i
        );
      }
      return [...prev, { product_id: product.id, product_name: product.name, quantity: 1, unit_price: product.price, total_price: product.price }];
    });
  };

  const addCustomItem = () => {
    if (!customName.trim() || !customPrice) return;
    const price = parseFloat(customPrice);
    if (isNaN(price) || price <= 0) { toast.error("Invalid price"); return; }
    setCart((prev) => [...prev, { product_id: null, product_name: customName.trim(), quantity: 1, unit_price: price, total_price: price }]);
    setCustomName("");
    setCustomPrice("");
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const qty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: qty, total_price: qty * item.unit_price };
      })
    );
  };

  const removeItem = (index: number) => setCart((prev) => prev.filter((_, i) => i !== index));

  const subtotal = cart.reduce((s, i) => s + i.total_price, 0);
  const taxAmount = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST placeholder
  const total = subtotal + taxAmount;

  const createBill = useMutation({
    mutationFn: async () => {
      if (!merchant || cart.length === 0) throw new Error("Add items first");
      const billNumber = `SB-${Date.now().toString(36).toUpperCase()}`;
      const { data: bill, error: billErr } = await supabase
        .from("bills")
        .insert({
          merchant_id: merchant.id,
          bill_number: billNumber,
          customer_phone: customerPhone || null,
          customer_name: customerName || null,
          subtotal,
          tax_amount: taxAmount,
          total_amount: total,
          payment_method: paymentMethod,
        })
        .select()
        .single();
      if (billErr) throw billErr;

      const items = cart.map((i) => ({
        bill_id: bill.id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.total_price,
      }));
      const { error: itemsErr } = await supabase.from("bill_items").insert(items);
      if (itemsErr) throw itemsErr;

      return bill;
    },
    onSuccess: (bill) => {
      toast.success(`Bill ${bill.bill_number} created — ₹${total.toLocaleString()}`);
      setCart([]);
      setCustomerPhone("");
      setCustomerName("");
      queryClient.invalidateQueries({ queryKey: ["merchant-stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <MerchantLayout>
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-bold text-foreground">Billing Terminal</h1>

        <div className="grid gap-4 lg:grid-cols-5">
          {/* Product search */}
          <div className="lg:col-span-3 space-y-4">
            <Card className="glass p-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search products..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  maxLength={100}
                />
              </div>

              <div className="grid gap-2 sm:grid-cols-2 max-h-48 overflow-y-auto">
                {products?.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart({ id: p.id, name: p.name, price: Number(p.price) })}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-accent/50 hover:bg-accent text-left transition-colors"
                  >
                    <span className="text-sm font-medium text-foreground truncate">{p.name}</span>
                    <span className="text-sm text-portal-merchant font-bold shrink-0 ml-2">₹{Number(p.price)}</span>
                  </button>
                ))}
                {products?.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-2">No products found. Add custom item below.</p>
                )}
              </div>
            </Card>

            {/* Custom item */}
            <Card className="glass p-4">
              <p className="text-sm font-medium text-foreground mb-2">Add Custom Item</p>
              <div className="flex gap-2">
                <Input placeholder="Item name" value={customName} onChange={(e) => setCustomName(e.target.value)} maxLength={100} className="flex-1" />
                <Input placeholder="Price" type="number" value={customPrice} onChange={(e) => setCustomPrice(e.target.value)} className="w-24" />
                <Button onClick={addCustomItem} size="icon" className="bg-portal-merchant hover:bg-portal-merchant/90 text-primary-foreground shrink-0">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Cart */}
          <div className="lg:col-span-2">
            <Card className="glass p-4 space-y-4">
              <h2 className="font-display font-bold text-foreground">Current Bill</h2>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Customer Phone</Label>
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="Optional" maxLength={15} />
                </div>
                <div>
                  <Label className="text-xs">Customer Name</Label>
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Optional" maxLength={100} />
                </div>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {cart.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No items added</p>}
                {cart.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-accent/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">₹{item.unit_price} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(i, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-bold w-6 text-center text-foreground">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => updateQuantity(i, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <span className="text-sm font-bold text-foreground w-16 text-right">₹{item.total_price}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border/50 pt-3 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (5%)</span><span>₹{taxAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-display font-bold text-lg text-foreground pt-1">
                  <span>Total</span><span>₹{total.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI / QR</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="credit">Pay Later (Credit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                className="w-full bg-portal-merchant hover:bg-portal-merchant/90 text-primary-foreground"
                disabled={cart.length === 0 || createBill.isPending}
                onClick={() => createBill.mutate()}
              >
                <Receipt className="w-4 h-4 mr-2" />
                Generate Bill — ₹{total.toLocaleString()}
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
};

export default MerchantBilling;
