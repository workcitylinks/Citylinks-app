-- Create labor_profiles table for labor-specific onboarding and verification details
CREATE TABLE IF NOT EXISTS public.labor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  pan_number TEXT,
  labor_id_number TEXT,
  bank_account_number TEXT,
  approval_status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.labor_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view approved labor profiles"
ON public.labor_profiles
FOR SELECT
TO authenticated
USING (approval_status = 'approved');

CREATE POLICY "Labor can insert own record"
ON public.labor_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Labor can update own record"
ON public.labor_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Labor can view own record"
ON public.labor_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Employees can manage labor profiles"
ON public.labor_profiles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'employee'))
WITH CHECK (public.has_role(auth.uid(), 'employee'));

CREATE INDEX IF NOT EXISTS idx_labor_profiles_user_id ON public.labor_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_labor_profiles_approval_status ON public.labor_profiles(approval_status);

-- Add transporter verification fields required by onboarding
ALTER TABLE public.transporters
ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
ADD COLUMN IF NOT EXISTS pan_number TEXT,
ADD COLUMN IF NOT EXISTS dl_number TEXT,
ADD COLUMN IF NOT EXISTS business_permit_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT;

-- Timestamp helper trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_labor_profiles_updated_at ON public.labor_profiles;
CREATE TRIGGER set_labor_profiles_updated_at
BEFORE UPDATE ON public.labor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- Helper functions to avoid RLS recursion between orders, order_items and profiles
CREATE OR REPLACE FUNCTION public.current_user_merchant_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.merchants
  WHERE user_id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.current_user_merchant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_merchant_ids() TO authenticated;

CREATE OR REPLACE FUNCTION public.customer_owns_order(_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders
    WHERE id = _order_id
      AND customer_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.customer_owns_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_owns_order(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.user_can_view_order(_order_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND (
        o.customer_id = auth.uid()
        OR public.has_role(auth.uid(), 'employee')
        OR EXISTS (
          SELECT 1
          FROM public.order_items oi
          WHERE oi.order_id = o.id
            AND oi.merchant_id IN (SELECT public.current_user_merchant_ids())
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.user_can_view_order(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_can_view_order(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.merchant_customer_ids_for_current_user()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT o.customer_id
  FROM public.orders o
  JOIN public.order_items oi ON oi.order_id = o.id
  WHERE oi.merchant_id IN (SELECT public.current_user_merchant_ids())
$$;

REVOKE ALL ON FUNCTION public.merchant_customer_ids_for_current_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.merchant_customer_ids_for_current_user() TO authenticated;

-- Replace recursive policies with function-based policies
DROP POLICY IF EXISTS "Merchants can view orders with their items" ON public.orders;
CREATE POLICY "Merchants can view orders with their items"
ON public.orders
FOR SELECT
TO authenticated
USING (public.user_can_view_order(id));

DROP POLICY IF EXISTS "Customers can insert own order items" ON public.order_items;
CREATE POLICY "Customers can insert own order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (public.customer_owns_order(order_id));

DROP POLICY IF EXISTS "Customers can view own order items" ON public.order_items;
CREATE POLICY "Customers can view own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.customer_owns_order(order_id));

DROP POLICY IF EXISTS "Merchants can view customer profiles for their orders" ON public.profiles;
CREATE POLICY "Merchants can view customer profiles for their orders"
ON public.profiles
FOR SELECT
TO authenticated
USING (id IN (SELECT public.merchant_customer_ids_for_current_user()));