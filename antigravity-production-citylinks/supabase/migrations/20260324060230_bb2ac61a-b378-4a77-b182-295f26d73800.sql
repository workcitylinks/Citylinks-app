
-- =============================================================
-- COMPREHENSIVE RLS & SCHEMA FIX
-- From GitHub zip migrations 1-8
-- =============================================================

-- Migration 1: Fix role and onboarding RLS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'transportation'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'transportation';
  END IF;
END $$;

-- Migration 5: DEFINITIVE RLS COMPREHENSIVE FIX
-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Employees can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employees can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employees can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Employees can delete profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Employees can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee'::app_role));
CREATE POLICY "Employees can update all profiles" ON public.profiles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));
CREATE POLICY "Employees can delete profiles" ON public.profiles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'employee'::app_role));

-- USER_ROLES
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Employees can manage roles" ON public.user_roles;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Employees can manage roles" ON public.user_roles FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- MERCHANTS
DROP POLICY IF EXISTS "Merchants can view own record" ON public.merchants;
DROP POLICY IF EXISTS "Merchants can insert own record" ON public.merchants;
DROP POLICY IF EXISTS "Merchants can update own record" ON public.merchants;
DROP POLICY IF EXISTS "Users can insert own merchant record" ON public.merchants;
DROP POLICY IF EXISTS "Users can update own merchant record" ON public.merchants;
DROP POLICY IF EXISTS "Employees can view merchants" ON public.merchants;
DROP POLICY IF EXISTS "Employees can view all merchants" ON public.merchants;
DROP POLICY IF EXISTS "Employees can update merchants" ON public.merchants;
DROP POLICY IF EXISTS "Employees can delete merchants" ON public.merchants;
DROP POLICY IF EXISTS "Authenticated users can view approved merchants" ON public.merchants;
DROP POLICY IF EXISTS "Employees can manage merchants" ON public.merchants;

CREATE POLICY "Merchants can view own record" ON public.merchants FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Merchants can insert own record" ON public.merchants FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Merchants can update own record" ON public.merchants FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view approved merchants" ON public.merchants FOR SELECT TO authenticated USING (approval_status = 'approved');
CREATE POLICY "Employees can manage merchants" ON public.merchants FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- MERCHANT_PRODUCTS
DROP POLICY IF EXISTS "Merchant can manage own products" ON public.merchant_products;
DROP POLICY IF EXISTS "Customers can view online products" ON public.merchant_products;
DROP POLICY IF EXISTS "Employees can view all products" ON public.merchant_products;

CREATE POLICY "Merchant can manage own products" ON public.merchant_products FOR ALL TO authenticated USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())) WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));
CREATE POLICY "Customers can view online products" ON public.merchant_products FOR SELECT TO authenticated USING (is_online = true AND is_active = true);
CREATE POLICY "Employees can view all products" ON public.merchant_products FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee'::app_role));

-- BILLS
DROP POLICY IF EXISTS "Merchant can manage own bills" ON public.bills;
DROP POLICY IF EXISTS "Employees can view all bills" ON public.bills;

CREATE POLICY "Merchant can manage own bills" ON public.bills FOR ALL TO authenticated USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())) WITH CHECK (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));
CREATE POLICY "Employees can view all bills" ON public.bills FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee'::app_role));

-- BILL_ITEMS
DROP POLICY IF EXISTS "Merchant can manage own bill items" ON public.bill_items;

CREATE POLICY "Merchant can manage own bill items" ON public.bill_items FOR ALL TO authenticated USING (bill_id IN (SELECT b.id FROM public.bills b JOIN public.merchants m ON b.merchant_id = m.id WHERE m.user_id = auth.uid())) WITH CHECK (bill_id IN (SELECT b.id FROM public.bills b JOIN public.merchants m ON b.merchant_id = m.id WHERE m.user_id = auth.uid()));

-- MERCHANT_CATEGORIES
DROP POLICY IF EXISTS "Anyone can view categories" ON public.merchant_categories;
CREATE POLICY "Anyone can view categories" ON public.merchant_categories FOR SELECT TO authenticated USING (true);

-- TRANSPORTERS
DROP POLICY IF EXISTS "Transporters can view own record" ON public.transporters;
DROP POLICY IF EXISTS "Transporters can insert own record" ON public.transporters;
DROP POLICY IF EXISTS "Transporters can update own record" ON public.transporters;
DROP POLICY IF EXISTS "Users can insert own transporter record" ON public.transporters;
DROP POLICY IF EXISTS "Users can update own transporter record" ON public.transporters;
DROP POLICY IF EXISTS "Users can view own transporter record" ON public.transporters;
DROP POLICY IF EXISTS "Employees can update transporters" ON public.transporters;
DROP POLICY IF EXISTS "Employees can view all transporters" ON public.transporters;
DROP POLICY IF EXISTS "Employees can manage transporters" ON public.transporters;
DROP POLICY IF EXISTS "Authenticated users can view approved transporters" ON public.transporters;

CREATE POLICY "Transporters can view own record" ON public.transporters FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Transporters can insert own record" ON public.transporters FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Transporters can update own record" ON public.transporters FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Authenticated users can view approved transporters" ON public.transporters FOR SELECT TO authenticated USING (approval_status = 'approved');
CREATE POLICY "Employees can manage transporters" ON public.transporters FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- TRANSPORTER_VEHICLES
DROP POLICY IF EXISTS "Owners manage vehicles" ON public.transporter_vehicles;
DROP POLICY IF EXISTS "Employees manage vehicles" ON public.transporter_vehicles;

CREATE POLICY "Owners manage vehicles" ON public.transporter_vehicles FOR ALL TO authenticated USING (transporter_id IN (SELECT id FROM public.transporters WHERE user_id = auth.uid())) WITH CHECK (transporter_id IN (SELECT id FROM public.transporters WHERE user_id = auth.uid()));
CREATE POLICY "Employees manage vehicles" ON public.transporter_vehicles FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- TRANSPORT_BOOKINGS
DROP POLICY IF EXISTS "Customers manage transport bookings" ON public.transport_bookings;
DROP POLICY IF EXISTS "Transporters view bookings" ON public.transport_bookings;
DROP POLICY IF EXISTS "Transporters update bookings" ON public.transport_bookings;

CREATE POLICY "Customers manage transport bookings" ON public.transport_bookings FOR ALL TO authenticated USING (customer_id = auth.uid()) WITH CHECK (customer_id = auth.uid());
CREATE POLICY "Transporters view bookings" ON public.transport_bookings FOR SELECT TO authenticated USING (transporter_id IN (SELECT id FROM public.transporters WHERE user_id = auth.uid()));
CREATE POLICY "Transporters update bookings" ON public.transport_bookings FOR UPDATE TO authenticated USING (transporter_id IN (SELECT id FROM public.transporters WHERE user_id = auth.uid())) WITH CHECK (transporter_id IN (SELECT id FROM public.transporters WHERE user_id = auth.uid()));

-- LABOR_SERVICES
DROP POLICY IF EXISTS "Labor can manage own services" ON public.labor_services;
DROP POLICY IF EXISTS "Anyone can view active services" ON public.labor_services;
DROP POLICY IF EXISTS "Labor users can view own services" ON public.labor_services;
DROP POLICY IF EXISTS "Labor users can insert own services" ON public.labor_services;
DROP POLICY IF EXISTS "Labor users can update own services" ON public.labor_services;

CREATE POLICY "Labor can manage own services" ON public.labor_services FOR ALL TO authenticated USING (auth.uid() = labor_id) WITH CHECK (auth.uid() = labor_id);
CREATE POLICY "Anyone can view active services" ON public.labor_services FOR SELECT TO authenticated USING (is_active = true);

-- SERVICE_BOOKINGS
DROP POLICY IF EXISTS "Labor can view own bookings" ON public.service_bookings;
DROP POLICY IF EXISTS "Labor can update own bookings" ON public.service_bookings;
DROP POLICY IF EXISTS "Customers can manage own bookings" ON public.service_bookings;

CREATE POLICY "Labor can view own bookings" ON public.service_bookings FOR SELECT TO authenticated USING (auth.uid() = labor_id);
CREATE POLICY "Labor can update own bookings" ON public.service_bookings FOR UPDATE TO authenticated USING (auth.uid() = labor_id) WITH CHECK (auth.uid() = labor_id);
CREATE POLICY "Customers can manage own bookings" ON public.service_bookings FOR ALL TO authenticated USING (auth.uid() = customer_id) WITH CHECK (auth.uid() = customer_id);

-- LABOR_AVAILABILITY
DROP POLICY IF EXISTS "Labor can manage own availability" ON public.labor_availability;
DROP POLICY IF EXISTS "Anyone can view availability" ON public.labor_availability;

CREATE POLICY "Labor can manage own availability" ON public.labor_availability FOR ALL TO authenticated USING (auth.uid() = labor_id) WITH CHECK (auth.uid() = labor_id);
CREATE POLICY "Anyone can view availability" ON public.labor_availability FOR SELECT TO authenticated USING (true);

-- ORDERS
DROP POLICY IF EXISTS "Customers can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can insert own orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can update own orders" ON public.orders;
DROP POLICY IF EXISTS "Employees can view all orders" ON public.orders;
DROP POLICY IF EXISTS "Employees can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Employees can manage orders" ON public.orders;

CREATE POLICY "Customers can view own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Customers can insert own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Customers can update own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Employees can manage orders" ON public.orders FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- ORDER_ITEMS
DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can insert own order items" ON public.order_items;
DROP POLICY IF EXISTS "Employees can view all order items" ON public.order_items;
DROP POLICY IF EXISTS "Employees can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Employees can manage order items" ON public.order_items;

CREATE POLICY "Customers can view own order items" ON public.order_items FOR SELECT TO authenticated USING (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));
CREATE POLICY "Customers can insert own order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (order_id IN (SELECT id FROM public.orders WHERE customer_id = auth.uid()));
CREATE POLICY "Employees can manage order items" ON public.order_items FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- SUPPORT_TICKETS
DROP POLICY IF EXISTS "Customers can view own tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Customers can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Employees can view all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Employees can update tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Employees can manage tickets" ON public.support_tickets;

CREATE POLICY "Customers can view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = customer_id);
CREATE POLICY "Employees can manage tickets" ON public.support_tickets FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- INTERNAL_MESSAGES
DROP POLICY IF EXISTS "Users can view own messages" ON public.internal_messages;
DROP POLICY IF EXISTS "Employees can send messages" ON public.internal_messages;
DROP POLICY IF EXISTS "Recipients can update own messages" ON public.internal_messages;
DROP POLICY IF EXISTS "Authenticated can send messages" ON public.internal_messages;
DROP POLICY IF EXISTS "Anyone can send notifications" ON public.internal_messages;

CREATE POLICY "Users can view own messages" ON public.internal_messages FOR SELECT TO authenticated USING (auth.uid() = recipient_id OR auth.uid() = sender_id);
CREATE POLICY "Authenticated can send messages" ON public.internal_messages FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Recipients can update own messages" ON public.internal_messages FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

-- AUDIT_LOGS
DROP POLICY IF EXISTS "Employees can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Employees can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;

CREATE POLICY "Employees can view audit logs" ON public.audit_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee'::app_role));
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- LOCATIONS
DROP POLICY IF EXISTS "Anyone authenticated can view locations" ON public.locations;
DROP POLICY IF EXISTS "Employees can manage locations" ON public.locations;

CREATE POLICY "Anyone authenticated can view locations" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Employees can manage locations" ON public.locations FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- EMPLOYEES
DROP POLICY IF EXISTS "Employees can view all employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can manage employees" ON public.employees;

CREATE POLICY "Employees can view all employees" ON public.employees FOR SELECT TO authenticated USING (has_role(auth.uid(), 'employee'::app_role));
CREATE POLICY "Employees can manage employees" ON public.employees FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- Migration 6: merchant_change_requests table
CREATE TABLE IF NOT EXISTS public.merchant_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.merchant_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants can view own change requests" ON public.merchant_change_requests;
DROP POLICY IF EXISTS "Merchants can insert own change requests" ON public.merchant_change_requests;
DROP POLICY IF EXISTS "Employees can manage change requests" ON public.merchant_change_requests;

CREATE POLICY "Merchants can view own change requests" ON public.merchant_change_requests FOR SELECT TO authenticated USING (requested_by = auth.uid());
CREATE POLICY "Merchants can insert own change requests" ON public.merchant_change_requests FOR INSERT TO authenticated WITH CHECK (requested_by = auth.uid());
CREATE POLICY "Employees can manage change requests" ON public.merchant_change_requests FOR ALL TO authenticated USING (has_role(auth.uid(), 'employee'::app_role)) WITH CHECK (has_role(auth.uid(), 'employee'::app_role));

-- Migration 7: merchant order acceptance columns
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS merchant_id UUID REFERENCES public.merchants(id);
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS merchant_status TEXT NOT NULL DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_order_items_merchant ON public.order_items(merchant_id);

DROP POLICY IF EXISTS "Merchants can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Merchants can update own order items" ON public.order_items;

CREATE POLICY "Merchants can view own order items" ON public.order_items FOR SELECT TO authenticated USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));
CREATE POLICY "Merchants can update own order items" ON public.order_items FOR UPDATE TO authenticated USING (merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()));

-- Migration 8: Fix merchant visibility
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_customer_id_fkey;
ALTER TABLE public.orders ADD CONSTRAINT orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Merchants can view orders with their items" ON public.orders;
CREATE POLICY "Merchants can view orders with their items" ON public.orders FOR SELECT TO authenticated USING (id IN (SELECT order_id FROM public.order_items WHERE merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid())));

DROP POLICY IF EXISTS "Merchants can view customer profiles for their orders" ON public.profiles;
CREATE POLICY "Merchants can view customer profiles for their orders" ON public.profiles FOR SELECT TO authenticated USING (id IN (SELECT customer_id FROM public.orders WHERE id IN (SELECT order_id FROM public.order_items WHERE merchant_id IN (SELECT id FROM public.merchants WHERE user_id = auth.uid()))));
