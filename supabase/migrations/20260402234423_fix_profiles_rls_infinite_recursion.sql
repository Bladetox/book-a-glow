-- Applied to production as version 20260402234423; SQL exported from supabase_migrations.schema_migrations.
-- ============================================================
-- FIX: Infinite recursion in profiles RLS policies
-- The two broken policies query profiles FROM WITHIN a profiles policy
-- causing infinite recursion and 500 errors on ALL tables
-- Fix: use auth.uid() direct checks, never re-query profiles
-- ============================================================

-- Step 1: Drop all the recursive offending policies on profiles
DROP POLICY IF EXISTS "Superadmins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Superadmins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Step 2: Recreate them WITHOUT querying profiles inside profiles

-- Superadmins read: use user_roles table instead of profiles subquery
CREATE POLICY "Superadmins can read all profiles"
ON public.profiles FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_owner')
  )
);

-- Superadmins update: same fix
CREATE POLICY "Superadmins can update all profiles"
ON public.profiles FOR UPDATE
TO public
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'platform_owner')
  )
);

-- Users update own profile: remove the subquery that re-reads profiles
-- The original WITH CHECK re-queried profiles.role which caused recursion
-- Simple fix: only allow updating own row, role changes handled by admin separately
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
