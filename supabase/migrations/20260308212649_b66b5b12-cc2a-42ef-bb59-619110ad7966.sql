
-- Step 1a: Create tenants table (business registry)
CREATE TABLE public.tenants (
  id TEXT PRIMARY KEY,                          -- slug e.g. 'phenomebeauty'
  name TEXT NOT NULL,                           -- display name e.g. 'PhenomeBeauty'
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  theme_id TEXT DEFAULT 'standard',
  currency TEXT DEFAULT 'R',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Tenants: owners can read their own, public can read active tenants (for booking pages)
CREATE POLICY "Anyone can view active tenants"
  ON public.tenants FOR SELECT
  USING (is_active = true);

CREATE POLICY "Owners can update own tenant"
  ON public.tenants FOR UPDATE
  USING (auth.uid() = owner_id);

-- Step 1b: Create app_role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'staff', 'client');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, tenant_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- user_roles: users can see their own roles, admins/owners can see all roles for their tenant
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Step 1c: Security definer function to check roles without RLS recursion
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _tenant_id TEXT, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND tenant_id = _tenant_id
      AND role = _role
  );
$$;

-- Step 1d: Helper to get a user's tenant_id (for the most common case: single-tenant users)
CREATE OR REPLACE FUNCTION public.get_user_tenant_id(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1;
$$;

-- Step 1e: Seed PhenomeBeauty as the first tenant
INSERT INTO public.tenants (id, name, email, phone, address, theme_id, currency)
VALUES (
  'phenomebeauty',
  'PhenomeBeauty',
  'phenomebeauty@gmail.co.za',
  '+27 74 511 5725',
  '14 Kunene Drive, Portlands, Cape Town',
  'standard',
  'R'
);
