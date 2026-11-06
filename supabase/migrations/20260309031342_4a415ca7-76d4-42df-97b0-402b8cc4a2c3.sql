
-- Allow service_role (edge functions) to insert tenants
-- Owners should also be able to insert their own tenant (during signup)
CREATE POLICY "Authenticated users can create tenants"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Service role already bypasses RLS, but add explicit INSERT for user_roles
-- so that tenant admins can invite staff / assign roles
CREATE POLICY "Tenant admins can insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_tenant_admin(auth.uid(), tenant_id)
  );

-- Allow tenant admins to update roles (e.g. promote staff)
CREATE POLICY "Tenant admins can update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id))
  WITH CHECK (public.is_tenant_admin(auth.uid(), tenant_id));

-- Allow tenant admins to delete roles (e.g. remove staff)
CREATE POLICY "Tenant admins can delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.is_tenant_admin(auth.uid(), tenant_id));
