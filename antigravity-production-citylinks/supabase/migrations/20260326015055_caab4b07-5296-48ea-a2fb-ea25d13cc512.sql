DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;

DROP POLICY IF EXISTS "Authenticated can send messages" ON public.internal_messages;
CREATE POLICY "Authenticated can send messages"
ON public.internal_messages
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id);