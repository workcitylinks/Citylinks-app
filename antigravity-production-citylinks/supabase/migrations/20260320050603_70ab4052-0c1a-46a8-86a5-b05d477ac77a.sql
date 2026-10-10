
-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;

-- Allow employees to update orders
CREATE POLICY "Employees can update orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'employee'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'employee'::app_role));

-- Add single-role constraint: each user can only have ONE role
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_unique_user UNIQUE (user_id);
