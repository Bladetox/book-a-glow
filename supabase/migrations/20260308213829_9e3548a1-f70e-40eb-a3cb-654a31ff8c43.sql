
-- Fix 1: Add WITH CHECK to prevent clients from tampering with financial fields
-- Drop and recreate the policy with proper WITH CHECK
DROP POLICY IF EXISTS "Clients update own pending bookings" ON public.bookings;

CREATE POLICY "Clients update own pending bookings"
  ON public.bookings FOR UPDATE TO authenticated
  USING (auth.uid() = client_id AND status = 'pending')
  WITH CHECK (
    auth.uid() = client_id
    AND status = 'pending'
  );

-- Create a trigger to prevent clients from modifying financial fields
CREATE OR REPLACE FUNCTION public.protect_booking_financial_fields()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Allow service_role and tenant admins to change anything
  IF (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF is_tenant_admin(auth.uid(), OLD.tenant_id) THEN
    RETURN NEW;
  END IF;

  -- For regular users (clients), protect financial and status fields
  IF NEW.total_amount IS DISTINCT FROM OLD.total_amount
    OR NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
    OR NEW.deposit_paid IS DISTINCT FROM OLD.deposit_paid
    OR NEW.full_payment_received IS DISTINCT FROM OLD.full_payment_received
    OR NEW.call_out_fee IS DISTINCT FROM OLD.call_out_fee
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
    OR NEW.tenant_id IS DISTINCT FROM OLD.tenant_id
  THEN
    RAISE EXCEPTION 'Cannot modify protected booking fields';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_booking_fields_trigger ON public.bookings;
CREATE TRIGGER protect_booking_fields_trigger
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_booking_financial_fields();

-- Fix 2: Tighten webhook INSERT policy - only allow authenticated users to insert for their own bookings
DROP POLICY IF EXISTS "Authenticated insert webhooks" ON public.webhook_queue;

CREATE POLICY "Authenticated insert webhooks"
  ON public.webhook_queue FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.id = webhook_queue.booking_id
        AND (b.client_id = auth.uid() OR b.staff_id = auth.uid() OR is_tenant_admin(auth.uid(), b.tenant_id))
    )
  );
