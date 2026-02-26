-- Migration: Enable RLS on prompt_templates
-- Date: 2026-02-26
-- Purpose: Defense-in-depth — restrict PostgREST access to super_admin only
-- Prisma uses postgres superuser (bypasses RLS) so this does NOT affect dashboard operations
-- This protects against direct Supabase client access (PostgREST / anon / authenticated roles)

-- 1. Enable RLS
ALTER TABLE prompt_templates ENABLE ROW LEVEL SECURITY;

-- 2. Allow service_role full access (Supabase admin operations)
CREATE POLICY "service_role_full_access"
  ON prompt_templates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Allow authenticated super_admins to read templates
--    (needed if Supabase client is ever used for reads in the future)
CREATE POLICY "super_admin_select"
  ON prompt_templates
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.is_super_admin = true
    )
  );

-- 4. No INSERT/UPDATE/DELETE policies for authenticated role
--    All mutations go through Prisma (server actions with requireSuperAdmin guard)
--    If PostgREST mutations are needed in the future, add policies here

COMMENT ON TABLE prompt_templates IS 'RLS enabled. Mutations via Prisma server actions only (requireSuperAdmin). PostgREST read access limited to super_admin.';
