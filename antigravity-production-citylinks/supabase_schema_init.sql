
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('customer', 'merchant', 'employee', 'labor');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Employees can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'employee'));

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Labor services table
CREATE TABLE public.labor_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_id uuid NOT NULL,
  service_name text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  hourly_rate numeric(10,2),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.labor_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Labor can manage own services" ON public.labor_services
  FOR ALL TO authenticated
  USING (auth.uid() = labor_id)
  WITH CHECK (auth.uid() = labor_id);

CREATE POLICY "Anyone can view active services" ON public.labor_services
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Service bookings table
CREATE TABLE public.service_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  service_id uuid REFERENCES public.labor_services(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'confirmed', 'in_progress', 'completed', 'cancelled')),
  scheduled_date date NOT NULL,
  scheduled_time time,
  address text,
  notes text,
  rating integer,
  review text,
  total_amount numeric(10,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Labor can view own bookings" ON public.service_bookings
  FOR SELECT TO authenticated
  USING (auth.uid() = labor_id);

CREATE POLICY "Labor can update own bookings" ON public.service_bookings
  FOR UPDATE TO authenticated
  USING (auth.uid() = labor_id)
  WITH CHECK (auth.uid() = labor_id);

CREATE POLICY "Customers can manage own bookings" ON public.service_bookings
  FOR ALL TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

-- Labor availability table
CREATE TABLE public.labor_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  labor_id uuid NOT NULL,
  date date NOT NULL,
  is_available boolean NOT NULL DEFAULT true,
  start_time time DEFAULT '09:00',
  end_time time DEFAULT '18:00',
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(labor_id, date)
);

ALTER TABLE public.labor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Labor can manage own availability" ON public.labor_availability
  FOR ALL TO authenticated
  USING (auth.uid() = labor_id)
  WITH CHECK (auth.uid() = labor_id);

CREATE POLICY "Anyone can view availability" ON public.labor_availability
  FOR SELECT TO authenticated
  USING (true);

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
  approval_status text NOT NULL DEFAULT 'approved',
  approved_by uuid,
  approved_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchants_user_id ON public.merchants(user_id);
CREATE INDEX idx_merchants_approval_status ON public.merchants(approval_status);

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

CREATE INDEX idx_merchant_products_merchant_id ON public.merchant_products(merchant_id);
CREATE INDEX idx_merchant_products_category_id ON public.merchant_products(category_id);
CREATE INDEX idx_merchant_products_active_online ON public.merchant_products(is_active, is_online);

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

CREATE INDEX idx_bills_merchant_id ON public.bills(merchant_id);
CREATE INDEX idx_bills_created_at ON public.bills(created_at DESC);

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

CREATE INDEX idx_bill_items_bill_id ON public.bill_items(bill_id);

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

-- Locations hierarchy table (State > District > Taluq > Hobli)
CREATE TABLE public.locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('state', 'district', 'taluq', 'hobli')),
  parent_id UUID REFERENCES public.locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_locations_parent ON public.locations(parent_id);
CREATE INDEX idx_locations_type ON public.locations(type);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view locations"
ON public.locations FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Employees can manage locations"
ON public.locations FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'employee'))
WITH CHECK (public.has_role(auth.uid(), 'employee'));

-- Employees table (tier + location assignment)
CREATE TABLE public.employees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  tier TEXT NOT NULL CHECK (tier IN ('A1', 'A2', 'A3', 'A4')),
  title TEXT,
  location_id UUID REFERENCES public.locations(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view all employees"
ON public.employees FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'employee'));

CREATE POLICY "Admin can manage employees"
ON public.employees FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'employee'))
WITH CHECK (public.has_role(auth.uid(), 'employee'));

-- Internal messages / notifications
CREATE TABLE public.internal_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'notification' CHECK (message_type IN ('notification', 'approval_request', 'approval_response', 'escalation', 'general')),
  reference_type TEXT,
  reference_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_internal_messages_recipient ON public.internal_messages(recipient_id);
CREATE INDEX idx_internal_messages_read ON public.internal_messages(recipient_id, is_read);

ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
ON public.internal_messages FOR SELECT TO authenticated
USING (auth.uid() = recipient_id OR auth.uid() = sender_id);

CREATE POLICY "Employees can send messages"
ON public.internal_messages FOR INSERT TO authenticated
WITH CHECK (auth.uid() = sender_id AND public.has_role(auth.uid(), 'employee'));

CREATE POLICY "Recipients can update own messages"
ON public.internal_messages FOR UPDATE TO authenticated
USING (auth.uid() = recipient_id);

-- Support tickets
CREATE TABLE public.support_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_number TEXT NOT NULL UNIQUE,
  customer_id UUID NOT NULL,
  assigned_to UUID,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  location_id UUID REFERENCES public.locations(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can view own tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (auth.uid() = customer_id);

CREATE POLICY "Customers can create tickets"
ON public.support_tickets FOR INSERT TO authenticated
WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Employees can view all tickets"
ON public.support_tickets FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'employee'));

CREATE POLICY "Employees can update tickets"
ON public.support_tickets FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'employee'));

-- Audit log for security events
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'employee'));

CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Seed some default locations
INSERT INTO public.locations (id, name, type, parent_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Karnataka', 'state', NULL),
  ('a0000000-0000-0000-0000-000000000002', 'Bengaluru Urban', 'district', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'Mysuru', 'district', 'a0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', 'Bengaluru North', 'taluq', 'a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000005', 'Bengaluru South', 'taluq', 'a0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-000000000006', 'Yelahanka', 'hobli', 'a0000000-0000-0000-0000-000000000004'),
  ('a0000000-0000-0000-0000-000000000007', 'Byatarayanapura', 'hobli', 'a0000000-0000-0000-0000-000000000004');

-- Add hobli column to merchants for location-based routing
ALTER TABLE public.merchants ADD COLUMN IF NOT EXISTS hobli_id UUID REFERENCES public.locations(id);

-- Fix overly permissive audit_logs insert policy
DROP POLICY "System can insert audit logs" ON public.audit_logs;

CREATE POLICY "Authenticated users can insert audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add transportation to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'transportation';

-- Add new columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS aadhaar_number text,
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS address text;

-- Create avatar storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Add account_status to profiles (default approved so existing users work)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'approved';

-- Allow employees to view and update all profiles
CREATE POLICY "Employees can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'employee'));
CREATE POLICY "Employees can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'employee'));

-- Allow employees to manage user roles
CREATE POLICY "Employees can manage roles" ON public.user_roles FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'employee'))
  WITH CHECK (public.has_role(auth.uid(), 'employee'));

-- Transporters table
CREATE TABLE public.transporters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  email text,
  approval_status text NOT NULL DEFAULT 'approved',
  approved_by uuid,
  approved_at timestamptz DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  address text,
  city text,
  district text,
  state text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.transporters ENABLE ROW LEVEL SECURITY;

-- Transporter vehicles
CREATE TABLE public.transporter_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transporter_id uuid NOT NULL REFERENCES public.transporters(id) ON DELETE CASCADE,
  vehicle_type text NOT NULL,
  vehicle_name text NOT NULL,
  registration_number text,
  capacity text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transporter_vehicles_transporter_id ON public.transporter_vehicles(transporter_id);
ALTER TABLE public.transporter_vehicles ENABLE ROW LEVEL SECURITY;

-- Transport bookings
CREATE TABLE public.transport_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  transporter_id uuid NOT NULL REFERENCES public.transporters(id),
  vehicle_id uuid REFERENCES public.transporter_vehicles(id),
  pickup_address text NOT NULL,
  dropoff_address text NOT NULL,
  scheduled_date date NOT NULL,
  scheduled_time time,
  booking_type text NOT NULL DEFAULT 'ride',
  status text NOT NULL DEFAULT 'approved',
  fare_amount numeric,
  distance_km numeric,
  notes text,
  rating integer,
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_transport_bookings_customer_id ON public.transport_bookings(customer_id);
CREATE INDEX idx_transport_bookings_transporter_id ON public.transport_bookings(transporter_id);
ALTER TABLE public.transport_bookings ENABLE ROW LEVEL SECURITY;

-- Transporter RLS
CREATE POLICY "Transporters can view own" ON public.transporters FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Transporters can insert own" ON public.transporters FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Transporters can update own" ON public.transporters FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Employees view transporters" ON public.transporters FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'employee'));
CREATE POLICY "Employees update transporters" ON public.transporters FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'employee'));
CREATE POLICY "Employees insert transporters" ON public.transporters FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'employee'));

-- Vehicle RLS
CREATE POLICY "Owners manage vehicles" ON public.transporter_vehicles FOR ALL TO authenticated 
  USING (transporter_id IN (SELECT id FROM public.transporters WHERE user_id = auth.uid()))
  WITH CHECK (transporter_id IN (SELECT id FROM public.transporters WHERE user_id = auth.uid()));
CREATE POLICY "Employees manage vehicles" ON public.transporter_vehicles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'employee'))
  WITH CHECK (public.has_role(auth.uid(), 'employee'));

-- Booking RLS
CREATE POLICY "Customers manage transport bookings" ON public.transport_bookings FOR ALL TO authenticated 
  USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Transporters view bookings" ON public.transport_bookings FOR SELECT TO authenticated 
  USING (transporter_id IN (SELECT id FROM public.transporters WHERE user_id = auth.uid()));
CREATE POLICY "Transporters update bookings" ON public.transport_bookings FOR UPDATE TO authenticated 
  USING (transporter_id IN (SELECT id FROM public.transporters WHERE user_id = auth.uid()));

-- Update handle_new_user to set account_status based on provider
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, account_status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
    CASE 
      WHEN NEW.raw_app_meta_data->>'provider' = 'google' THEN 'approved'
      WHEN NEW.email LIKE '%@citylinks.in' THEN 'approved'
      ELSE 'pending'
    END
  );
  RETURN NEW;
END;
$$;
-- Assign employee role to sachi.hvr@gmail.com
INSERT INTO public.user_roles (user_id, role) 
VALUES ('379dd6bc-3e74-44f8-aec7-f06f9385dd6f', 'employee')
ON CONFLICT (user_id, role) DO NOTHING;

-- Create employee record
INSERT INTO public.employees (user_id, tier, title)
SELECT '379dd6bc-3e74-44f8-aec7-f06f9385dd6f', 'A1', 'Admin'
WHERE NOT EXISTS (SELECT 1 FROM public.employees WHERE user_id = '379dd6bc-3e74-44f8-aec7-f06f9385dd6f');

-- Create 10 test merchants with unique generated user_ids
INSERT INTO public.merchants (user_id, business_name, business_type, phone, email, city, district, state, taluq, pincode, gst_number, pan_number, approval_status, onboarding_complete, onboarding_step) VALUES
(gen_random_uuid(), 'Kumar General Store', 'retail', '9876543210', 'kumar@shop.com', 'Hubli', 'Dharwad', 'Karnataka', 'Hubli', '580021', '29AABCT1332L1ZL', 'FGHIJ5678K', 'approved', true, 4),
(gen_random_uuid(), 'Sharma Electronics', 'retail', '9876543211', 'sharma@shop.com', 'Dharwad', 'Dharwad', 'Karnataka', 'Dharwad', '580001', '07AAGCA1234B1ZX', 'LMNOP9012Q', 'approved', true, 4),
(gen_random_uuid(), 'Patel Grocery', 'wholesale', '9876543212', 'patel@shop.com', 'Belgaum', 'Belgaum', 'Karnataka', 'Belgaum', '590001', NULL, NULL, 'approved', true, 4),
(gen_random_uuid(), 'Desai Restaurant', 'restaurant', '9876543213', 'desai@food.com', 'Gadag', 'Gadag', 'Karnataka', 'Gadag', '582101', NULL, NULL, 'approved', false, 2),
(gen_random_uuid(), 'Reddy Pharmacy', 'pharmacy', '9876543214', 'reddy@pharma.com', 'Haveri', 'Haveri', 'Karnataka', 'Haveri', '581110', NULL, 'RSTUV3456W', 'approved', true, 4),
(gen_random_uuid(), 'Naik Traders', 'wholesale', '9876543215', 'naik@trade.com', 'Karwar', 'Uttara Kannada', 'Karnataka', 'Karwar', '581301', NULL, NULL, 'approved', true, 4),
(gen_random_uuid(), 'Hegde Services', 'service', '9876543216', 'hegde@srv.com', 'Sirsi', 'Uttara Kannada', 'Karnataka', 'Sirsi', '581401', NULL, NULL, 'approved', true, 4),
(gen_random_uuid(), 'Joshi Bakery', 'restaurant', '9876543217', 'joshi@bake.com', 'Hubli', 'Dharwad', 'Karnataka', 'Hubli', '580020', NULL, NULL, 'approved', true, 4),
(gen_random_uuid(), 'Kulkarni Hardware', 'retail', '9876543218', 'kulkarni@hw.com', 'Dharwad', 'Dharwad', 'Karnataka', 'Dharwad', '580002', NULL, NULL, 'approved', true, 4),
(gen_random_uuid(), 'Patil Textiles', 'retail', '9876543219', 'patil@text.com', 'Hubli', 'Dharwad', 'Karnataka', 'Hubli', '580023', NULL, NULL, 'rejected', true, 4);

-- Create 10 test transporters with unique user_ids
INSERT INTO public.transporters (user_id, full_name, phone, email, city, district, state, approval_status) VALUES
(gen_random_uuid(), 'Ramesh Driver', '9988776601', 'ramesh@drive.com', 'Hubli', 'Dharwad', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Suresh Transporter', '9988776602', 'suresh@trans.com', 'Dharwad', 'Dharwad', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Mahesh Logistics', '9988776603', 'mahesh@log.com', 'Belgaum', 'Belgaum', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Ganesh Carrier', '9988776604', 'ganesh@carry.com', 'Gadag', 'Gadag', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Dinesh Movers', '9988776605', 'dinesh@move.com', 'Haveri', 'Haveri', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Rajesh Transport', '9988776606', 'rajesh@trans.com', 'Karwar', 'Uttara Kannada', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Naresh Rides', '9988776607', 'naresh@ride.com', 'Sirsi', 'Uttara Kannada', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Hitesh Express', '9988776608', 'hitesh@exp.com', 'Hubli', 'Dharwad', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Nilesh Delivery', '9988776609', 'nilesh@del.com', 'Dharwad', 'Dharwad', 'Karnataka', 'approved'),
(gen_random_uuid(), 'Paresh Auto', '9988776610', 'paresh@auto.com', 'Belgaum', 'Belgaum', 'Karnataka', 'approved');
-- Add test products for the approved merchants
INSERT INTO public.merchant_products (merchant_id, name, price, description, unit, stock_quantity, is_online, is_active, sku)
SELECT m.id, p.name, p.price, p.description, p.unit, p.stock_quantity, true, true, p.sku
FROM public.merchants m
CROSS JOIN (VALUES
  ('Fresh Bread Loaf', 45, 'Freshly baked whole wheat bread', 'piece', 50, 'JB-001'),
  ('Butter Croissant', 60, 'Flaky French-style croissant', 'piece', 30, 'JB-002'),
  ('Chocolate Cake', 350, 'Rich dark chocolate cake 500g', 'piece', 10, 'JB-003'),
  ('Samosa Pack (6)', 90, 'Crispy vegetable samosas', 'pack', 25, 'JB-004'),
  ('Masala Chai', 20, 'Hot masala tea', 'cup', 100, 'JB-005')
) AS p(name, price, description, unit, stock_quantity, sku)
WHERE m.business_name = 'Joshi Bakery'
LIMIT 5;

INSERT INTO public.merchant_products (merchant_id, name, price, description, unit, stock_quantity, is_online, is_active, sku)
SELECT m.id, p.name, p.price, p.description, p.unit, p.stock_quantity, true, true, p.sku
FROM public.merchants m
CROSS JOIN (VALUES
  ('Hammer Claw 16oz', 280, 'Heavy duty claw hammer', 'piece', 20, 'KH-001'),
  ('PVC Pipe 1 inch', 120, '1 inch PVC pipe 6ft length', 'piece', 50, 'KH-002'),
  ('Paint Brush Set', 195, '5-piece paint brush set', 'set', 15, 'KH-003'),
  ('Cement (50kg)', 400, 'OPC 53 Grade cement bag', 'bag', 100, 'KH-004'),
  ('Wire 1mm (90m)', 850, 'Copper electrical wire roll', 'roll', 30, 'KH-005')
) AS p(name, price, description, unit, stock_quantity, sku)
WHERE m.business_name = 'Kulkarni Hardware'
LIMIT 5;

-- Orders table
CREATE TABLE public.orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number TEXT NOT NULL,
  customer_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
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

CREATE INDEX idx_orders_customer_id ON public.orders(customer_id);
CREATE INDEX idx_orders_created_at ON public.orders(created_at DESC);

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

CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

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
