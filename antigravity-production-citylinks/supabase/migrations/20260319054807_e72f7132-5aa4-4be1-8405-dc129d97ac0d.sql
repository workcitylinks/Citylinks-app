
-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  customer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  transport_type TEXT NOT NULL DEFAULT 'scooty',
  transport_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  delivery_address TEXT NOT NULL,
  notes TEXT,
  need_labor BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.merchant_products(id),
  product_name TEXT NOT NULL,
  merchant_name TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Orders RLS: customers can manage own orders
CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Customers can insert own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can update own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = customer_id);

-- Employees can view all orders
CREATE POLICY "Employees can view all orders" ON public.orders FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee'::app_role));

-- Order items RLS
CREATE POLICY "Customers can view own order items" ON public.order_items FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));
CREATE POLICY "Customers can insert own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));
