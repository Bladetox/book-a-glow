-- Tenant self-service subscription cancellation.
--
-- The admin Billing page used to have upgrade and downgrade only. Cancel is
-- added here as an owner-only SECURITY DEFINER function so the status change
-- does not depend on a raw client-side UPDATE of tenants.subscription_status.
--
-- Cancelling:
--   * sets subscription_status = 'cancelled' (the app treats this as a full
--     lockout, so the UI makes the guest-data export happen BEFORE this call)
--   * stamps cancelled_at
--   * stamps data_deletion_scheduled_at = now() + 30 days
--
-- NOTE: this migration only RECORDS the scheduled deletion date. It does not
-- delete anything. A purge job that honours data_deletion_scheduled_at must be
-- built separately (see handover notes) before the 30-day promise in the UI is
-- actually enforced. The retention period here and DATA_RETENTION_DAYS in
-- src/components/admin/CancelSubscriptionFlow.tsx must be kept in sync.

alter table public.tenants
  add column if not exists cancelled_at timestamptz,
  add column if not exists data_deletion_scheduled_at timestamptz;

create or replace function public.cancel_my_subscription(p_tenant_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant    public.tenants%rowtype;
  v_now       timestamptz := now();
  v_deletion  timestamptz := now() + interval '30 days';
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  select * into v_tenant
  from public.tenants
  where id = p_tenant_id
  for update;

  -- Owner only. Staff admins must not be able to cancel the business.
  if not found or v_tenant.owner_id is distinct from auth.uid() then
    raise exception 'Only the account owner can cancel the subscription'
      using errcode = '42501';
  end if;

  if v_tenant.is_lifetime_free then
    raise exception 'Lifetime free accounts have no subscription to cancel'
      using errcode = '22023';
  end if;

  if v_tenant.subscription_status = 'cancelled' then
    raise exception 'Subscription is already cancelled'
      using errcode = '22023';
  end if;

  update public.tenants
  set subscription_status         = 'cancelled',
      cancelled_at                = v_now,
      data_deletion_scheduled_at  = v_deletion,
      updated_at                  = v_now
  where id = p_tenant_id;

  return jsonb_build_object(
    'cancelled_at', v_now,
    'data_deletion_scheduled_at', v_deletion
  );
end;
$$;

revoke all on function public.cancel_my_subscription(text) from public, anon;
grant execute on function public.cancel_my_subscription(text) to authenticated;
