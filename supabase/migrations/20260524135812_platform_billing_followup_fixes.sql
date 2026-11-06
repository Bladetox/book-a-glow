-- Applied to production as version 20260524135812; SQL exported from supabase_migrations.schema_migrations.
-- Follow-up fixes for platform billing
-- 1) RLS needs per-operation policies; USING-only is not enough for inserts/updates.
-- 2) Add helper RPC for invoice creation.
-- 3) Add lifecycle helper RPC to mark invoice paid and roll tenant billing dates.
-- 4) Add superadmin-safe view for billing panel.

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role = 'super_admin'
  );
$$;

-- Replace broad policies with explicit ones
DROP POLICY IF EXISTS "superadmin_full_invoices" ON public.platform_invoices;
DROP POLICY IF EXISTS "superadmin_full_payments" ON public.platform_payments;

CREATE POLICY "superadmin_select_invoices"
ON public.platform_invoices
FOR SELECT
TO authenticated
USING ((select public.is_super_admin()));

CREATE POLICY "superadmin_insert_invoices"
ON public.platform_invoices
FOR INSERT
TO authenticated
WITH CHECK ((select public.is_super_admin()));

CREATE POLICY "superadmin_update_invoices"
ON public.platform_invoices
FOR UPDATE
TO authenticated
USING ((select public.is_super_admin()))
WITH CHECK ((select public.is_super_admin()));

CREATE POLICY "superadmin_delete_invoices"
ON public.platform_invoices
FOR DELETE
TO authenticated
USING ((select public.is_super_admin()));

CREATE POLICY "superadmin_select_payments"
ON public.platform_payments
FOR SELECT
TO authenticated
USING ((select public.is_super_admin()));

CREATE POLICY "superadmin_insert_payments"
ON public.platform_payments
FOR INSERT
TO authenticated
WITH CHECK ((select public.is_super_admin()));

CREATE POLICY "superadmin_update_payments"
ON public.platform_payments
FOR UPDATE
TO authenticated
USING ((select public.is_super_admin()))
WITH CHECK ((select public.is_super_admin()));

CREATE POLICY "superadmin_delete_payments"
ON public.platform_payments
FOR DELETE
TO authenticated
USING ((select public.is_super_admin()));

create or replace function public.create_platform_invoice(
  p_tenant_id text,
  p_plan text,
  p_amount numeric,
  p_period_start date,
  p_period_end date,
  p_due_date date,
  p_yoco_link text default null,
  p_notes text default null
)
returns public.platform_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.platform_invoices;
begin
  if not (select public.is_super_admin()) then
    raise exception 'Only super admins can create platform invoices';
  end if;

  insert into public.platform_invoices (
    tenant_id,
    invoice_number,
    plan,
    amount_rands,
    status,
    period_start,
    period_end,
    due_date,
    yoco_payment_link,
    notes
  ) values (
    p_tenant_id,
    public.next_invoice_number(),
    p_plan,
    p_amount,
    'unpaid',
    p_period_start,
    p_period_end,
    p_due_date,
    p_yoco_link,
    p_notes
  )
  returning * into v_invoice;

  update public.tenants
  set plan = p_plan,
      next_billing_date = (p_period_end + 1),
      grace_period_days = coalesce(grace_period_days, 7)
  where id = p_tenant_id;

  return v_invoice;
end;
$$;

grant execute on function public.create_platform_invoice(text,text,numeric,date,date,date,text,text) to authenticated;

create or replace function public.mark_platform_invoice_paid(
  p_invoice_id uuid,
  p_payment_method text default 'yoco_link',
  p_reference text default null,
  p_notes text default null,
  p_paid_at timestamptz default now()
)
returns public.platform_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.platform_invoices;
begin
  if not (select public.is_super_admin()) then
    raise exception 'Only super admins can mark invoices as paid';
  end if;

  select * into v_invoice
  from public.platform_invoices
  where id = p_invoice_id;

  if v_invoice.id is null then
    raise exception 'Invoice not found';
  end if;

  if v_invoice.status = 'paid' then
    return v_invoice;
  end if;

  insert into public.platform_payments (
    invoice_id,
    tenant_id,
    amount_rands,
    payment_method,
    yoco_charge_id,
    eft_reference,
    paid_at,
    recorded_by,
    notes
  ) values (
    v_invoice.id,
    v_invoice.tenant_id,
    v_invoice.amount_rands,
    p_payment_method,
    case when p_payment_method = 'yoco_link' then p_reference else null end,
    case when p_payment_method = 'eft' then p_reference else null end,
    p_paid_at,
    auth.uid(),
    p_notes
  );

  update public.platform_invoices
  set status = 'paid',
      paid_at = p_paid_at
  where id = v_invoice.id
  returning * into v_invoice;

  update public.tenants
  set subscription_status = case when subscription_status = 'trial' then 'active' else subscription_status end,
      subscription_start_date = coalesce(subscription_start_date, p_paid_at::date),
      next_billing_date = greatest(coalesce(next_billing_date, current_date), (v_invoice.period_end + 1)),
      grace_period_ends_at = null,
      billing_cycle_anchor = coalesce(billing_cycle_anchor, p_paid_at)
  where id = v_invoice.tenant_id;

  return v_invoice;
end;
$$;

grant execute on function public.mark_platform_invoice_paid(uuid,text,text,text,timestamptz) to authenticated;

create or replace function public.apply_platform_billing_lifecycle()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (select public.is_super_admin()) then
    raise exception 'Only super admins can run platform lifecycle';
  end if;

  update public.platform_invoices
  set status = 'overdue'
  where status = 'unpaid'
    and due_date < current_date;

  update public.tenants
  set grace_period_ends_at = trial_ends_at + make_interval(days => coalesce(grace_period_days, 7))
  where subscription_status = 'trial'
    and trial_ends_at is not null
    and trial_ends_at < now()
    and grace_period_ends_at is null;

  update public.tenants
  set subscription_status = 'trial_expired'
  where subscription_status = 'trial'
    and grace_period_ends_at is not null
    and grace_period_ends_at < now();
end;
$$;

grant execute on function public.apply_platform_billing_lifecycle() to authenticated;

create or replace view public.sa_platform_billing_overview
with (security_invoker = true)
as
select
  t.id as tenant_id,
  t.name as tenant_name,
  t.plan,
  t.subscription_status,
  t.trial_ends_at,
  t.grace_period_ends_at,
  t.next_billing_date,
  pi.id as invoice_id,
  pi.invoice_number,
  pi.amount_rands,
  pi.status as invoice_status,
  pi.period_start,
  pi.period_end,
  pi.due_date,
  pi.yoco_payment_link,
  pi.paid_at,
  pi.created_at as invoice_created_at
from public.tenants t
left join public.platform_invoices pi on pi.tenant_id = t.id;
