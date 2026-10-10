
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
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
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
