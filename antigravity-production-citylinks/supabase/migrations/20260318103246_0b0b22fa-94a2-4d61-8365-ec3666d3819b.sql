
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
  approval_status text NOT NULL DEFAULT 'pending',
  approved_by uuid,
  approved_at timestamptz,
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
  status text NOT NULL DEFAULT 'pending',
  fare_amount numeric,
  distance_km numeric,
  notes text,
  rating integer,
  review text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
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
