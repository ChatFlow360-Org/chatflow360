-- Migration: Enable RLS on prompt_pieces
-- Date: 2026-03-03
-- Purpose: Defense-in-depth — restrict PostgREST access by role
-- Prisma uses postgres superuser (bypasses RLS) so this does NOT affect dashboard operations
-- This protects against direct Supabase client access (PostgREST / anon / authenticated roles)

-- 1. Enable RLS
ALTER TABLE prompt_pieces ENABLE ROW LEVEL SECURITY;

-- 2. Allow service_role full access (Supabase admin operations, API routes like /api/chat)
CREATE POLICY "service_role_full_access"
  ON prompt_pieces
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Allow authenticated super_admins full read access
--    Super admins manage all pieces via prompt-templates page
--    All mutations go through Prisma (requireSuperAdmin guard)
CREATE POLICY "super_admin_select"
  ON prompt_pieces
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.is_super_admin = true
    )
  );

-- 4. Allow authenticated org members to read pieces for their org's business category
--    AI Settings page shows category pieces (read-only, locked) for the org's assigned category
--    Also allow reading global rules (categoryId IS NULL, type = 'rule') displayed locked in AI Settings
CREATE POLICY "org_member_select_category_pieces"
  ON prompt_pieces
  FOR SELECT
  TO authenticated
  USING (
    -- Global rules: visible to all authenticated users (displayed locked in AI Settings)
    (category_id IS NULL AND type = 'rule')
    OR
    -- Category pieces: visible to members of orgs assigned to that category
    category_id IN (
      SELECT o.business_category_id
      FROM organizations o
      INNER JOIN organization_members om ON om.organization_id = o.id
      WHERE om.user_id = auth.uid()
        AND o.business_category_id IS NOT NULL
    )
  );

-- 5. No INSERT/UPDATE/DELETE policies for authenticated role
--    All mutations go through Prisma server actions (requireSuperAdmin guard)

COMMENT ON TABLE prompt_pieces IS 'RLS enabled. Super admin full SELECT. Org members can read global rules + their category pieces. All mutations via Prisma (requireSuperAdmin).';
