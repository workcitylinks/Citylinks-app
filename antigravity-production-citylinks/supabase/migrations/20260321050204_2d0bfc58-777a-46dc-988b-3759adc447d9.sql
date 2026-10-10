
-- Clean up orphaned test data (merchants with fake user_ids not in auth.users)
DELETE FROM merchant_products WHERE merchant_id IN (SELECT id FROM merchants);
DELETE FROM merchants;
DELETE FROM transporters;
DELETE FROM transporter_vehicles;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM audit_logs;
DELETE FROM internal_messages;

-- Add DELETE policies for testing
CREATE POLICY "Employees can delete merchants"
ON public.merchants FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Employees can delete transporters"
ON public.transporters FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Employees can delete orders"
ON public.orders FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Employees can delete order items"
ON public.order_items FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Employees can view all order items"
ON public.order_items FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Employees can delete profiles"
ON public.profiles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));

CREATE POLICY "Employees can delete user_roles"
ON public.user_roles FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'employee'::app_role));

-- Create a function to auto-notify employees when merchants onboard
CREATE OR REPLACE FUNCTION public.notify_employees_new_merchant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  emp_user_id uuid;
BEGIN
  -- Send internal message to all employees
  FOR emp_user_id IN
    SELECT user_id FROM user_roles WHERE role = 'employee'
  LOOP
    INSERT INTO internal_messages (sender_id, recipient_id, subject, body, message_type, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      emp_user_id,
      'New Merchant Application: ' || NEW.business_name,
      'A new merchant "' || NEW.business_name || '" (' || NEW.business_type || ') has completed onboarding and is awaiting approval.',
      'approval_request',
      'merchant',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_merchant_onboarding
AFTER UPDATE OF onboarding_complete ON public.merchants
FOR EACH ROW
WHEN (NEW.onboarding_complete = true AND OLD.onboarding_complete = false)
EXECUTE FUNCTION public.notify_employees_new_merchant();

-- Notify employees on new orders
CREATE OR REPLACE FUNCTION public.notify_employees_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  emp_user_id uuid;
  cust_name text;
BEGIN
  SELECT COALESCE(full_name, 'Customer') INTO cust_name FROM profiles WHERE id = NEW.customer_id;
  
  FOR emp_user_id IN
    SELECT user_id FROM user_roles WHERE role = 'employee'
  LOOP
    INSERT INTO internal_messages (sender_id, recipient_id, subject, body, message_type, reference_type, reference_id)
    VALUES (
      NEW.customer_id,
      emp_user_id,
      'New Order: ' || NEW.order_number,
      'A new order ' || NEW.order_number || ' has been placed by ' || cust_name || ' for ₹' || NEW.total_amount || '. Transport: ' || NEW.transport_type || '.',
      'notification',
      'order',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_employees_new_order();

-- Notify employees on new transporter applications
CREATE OR REPLACE FUNCTION public.notify_employees_new_transporter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  emp_user_id uuid;
BEGIN
  FOR emp_user_id IN
    SELECT user_id FROM user_roles WHERE role = 'employee'
  LOOP
    INSERT INTO internal_messages (sender_id, recipient_id, subject, body, message_type, reference_type, reference_id)
    VALUES (
      NEW.user_id,
      emp_user_id,
      'New Transporter Application: ' || NEW.full_name,
      'A new transporter "' || NEW.full_name || '" from ' || COALESCE(NEW.city, 'N/A') || ' has registered and is awaiting approval.',
      'approval_request',
      'transporter',
      NEW.id
    );
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_transporter
AFTER INSERT ON public.transporters
FOR EACH ROW
EXECUTE FUNCTION public.notify_employees_new_transporter();

-- Also auto-assign customer role on Google sign-in if no role exists
CREATE OR REPLACE FUNCTION public.auto_assign_customer_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Auto-assign customer role if user has no roles and is approved
  IF NEW.account_status = 'approved' THEN
    IF NOT EXISTS (SELECT 1 FROM user_roles WHERE user_id = NEW.id) THEN
      INSERT INTO user_roles (user_id, role) VALUES (NEW.id, 'customer');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_customer_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_customer_role();
