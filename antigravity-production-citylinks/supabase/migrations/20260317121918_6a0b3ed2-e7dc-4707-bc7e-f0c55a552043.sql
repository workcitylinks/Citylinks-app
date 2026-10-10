
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
