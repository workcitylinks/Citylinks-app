
-- Fix infinite recursion: Replace the problematic orders SELECT policy
-- that uses user_can_view_order (which queries order_items)
-- with a simpler direct merchant check

DROP POLICY IF EXISTS "Merchants can view orders with their items" ON public.orders;

-- Create a SECURITY DEFINER function that checks merchant access to an order
-- without going through order_items RLS
CREATE OR REPLACE FUNCTION public.merchant_can_view_order(_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    WHERE oi.order_id = _order_id
      AND oi.merchant_id IN (
        SELECT m.id FROM public.merchants m WHERE m.user_id = auth.uid()
      )
  )
$$;

-- Separate policies for customers and merchants instead of one combined function
CREATE POLICY "Merchants can view orders containing their items"
ON public.orders
FOR SELECT
TO authenticated
USING (
  public.merchant_can_view_order(id)
);

-- Also fix order_items: replace can_access_order_item with separate simpler policies
DROP POLICY IF EXISTS "Users can view accessible order items" ON public.order_items;

CREATE POLICY "Customers can view own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  order_id IN (
    SELECT o.id FROM public.orders o WHERE o.customer_id = auth.uid()
  )
);

CREATE POLICY "Merchants can view own order items"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  merchant_id IN (
    SELECT public.current_user_merchant_ids()
  )
);
