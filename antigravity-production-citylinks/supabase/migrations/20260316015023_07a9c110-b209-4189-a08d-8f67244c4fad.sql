
-- Merchant onboarding & profile table
CREATE TABLE public.merchants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  business_name text NOT NULL,
  business_type text NOT NULL DEFAULT 'retail',
  gst_number text,
  pan_number text,
  bank_account_number text,
  bank_ifsc text,
  bank_name text,
  address text,
  city text,
  state text,
  district text,
  taluq text,
  pincode text,
  phone text,
  email text,
  logo_url text,
  onboarding_step integer NOT NULL DEFAULT 1,
  onboarding_complete boolean NOT NULL DEFAULT false,
  approval_status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchants can view own record" ON public.merchants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Merchants can insert own record" ON public.merchants
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can update own record" ON public.merchants
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Employees can view merchants for approval
CREATE POLICY "Employees can view merchants" ON public.merchants
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'employee'));

CREATE POLICY "Employees can update merchants" ON public.merchants
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'employee'));

-- Product categories
CREATE TABLE public.merchant_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view categories" ON public.merchant_categories
  FOR SELECT TO authenticated USING (true);

-- Products / Inventory
CREATE TABLE public.merchant_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  category_id uuid REFERENCES public.merchant_categories(id),
  name text NOT NULL,
  sku text,
  description text,
  price numeric NOT NULL DEFAULT 0,
  cost_price numeric,
  stock_quantity integer NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'piece',
  is_online boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant can manage own products" ON public.merchant_products
  FOR ALL TO authenticated USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  ) WITH CHECK (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );

CREATE POLICY "Customers can view online products" ON public.merchant_products
  FOR SELECT TO authenticated USING (is_online = true AND is_active = true);

-- Bills
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  bill_number text NOT NULL,
  customer_phone text,
  customer_name text,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'paid',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant can manage own bills" ON public.bills
  FOR ALL TO authenticated USING (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  ) WITH CHECK (
    merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())
  );

-- Bill line items
CREATE TABLE public.bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.merchant_products(id),
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bill_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Merchant can manage own bill items" ON public.bill_items
  FOR ALL TO authenticated USING (
    bill_id IN (SELECT b.id FROM public.bills b JOIN public.merchants m ON b.merchant_id = m.id WHERE m.user_id = auth.uid())
  ) WITH CHECK (
    bill_id IN (SELECT b.id FROM public.bills b JOIN public.merchants m ON b.merchant_id = m.id WHERE m.user_id = auth.uid())
  );

-- Insert default categories
INSERT INTO public.merchant_categories (name, description, icon) VALUES
  ('Groceries', 'Food and daily essentials', 'shopping-basket'),
  ('Electronics', 'Electronic devices and accessories', 'cpu'),
  ('Clothing', 'Apparel and fashion', 'shirt'),
  ('Hardware', 'Tools and building materials', 'wrench'),
  ('Pharmacy', 'Medical supplies and medicines', 'pill'),
  ('Stationery', 'Office and school supplies', 'pencil'),
  ('General', 'General merchandise', 'package');
