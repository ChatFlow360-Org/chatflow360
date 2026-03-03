-- Migration: Enable RLS on business_categories
-- Date: 2026-03-03
-- Purpose: Defense-in-depth — restrict PostgREST access to super_admin only
-- Prisma uses postgres superuser (bypasses RLS) so this does NOT affect dashboard operations
-- This protects against direct Supabase client access (PostgREST / anon / authenticated roles)

-- 1. Enable RLS
ALTER TABLE business_categories ENABLE ROW LEVEL SECURITY;

-- 2. Allow service_role full access (Supabase admin operations)
CREATE POLICY "service_role_full_access"
  ON business_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Allow authenticated super_admins full read access
--    All mutations go through Prisma (server actions with requireSuperAdmin guard)
--    Read access needed for org create/edit forms (category dropdown) and prompt-templates page
CREATE POLICY "super_admin_select"
  ON business_categories
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
--    All mutations go through Prisma server actions (requireSuperAdmin guard)

COMMENT ON TABLE business_categories IS 'RLS enabled. Mutations via Prisma server actions only (requireSuperAdmin). PostgREST read access limited to super_admin.';
