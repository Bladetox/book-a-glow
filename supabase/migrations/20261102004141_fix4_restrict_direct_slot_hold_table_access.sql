-- Close the direct table API path for temporary slot holds.
-- Guests must use the SECURITY DEFINER acquire/release RPCs; no client code reads or writes this table directly.
REVOKE ALL ON TABLE public.slot_holds FROM anon, authenticated;
DROP POLICY IF EXISTS allow_insert_hold ON public.slot_holds;
DROP POLICY IF EXISTS allow_delete_own_hold ON public.slot_holds;
DROP POLICY IF EXISTS allow_select_hold ON public.slot_holds;
