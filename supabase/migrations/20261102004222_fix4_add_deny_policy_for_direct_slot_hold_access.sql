-- Defense in depth: if table privileges are ever re-granted, client roles still cannot access hold rows directly.
CREATE POLICY slot_holds_no_direct_client_access
ON public.slot_holds
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
