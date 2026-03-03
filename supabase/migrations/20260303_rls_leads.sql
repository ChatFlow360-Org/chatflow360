-- Migration: Enable RLS on leads
-- Date: 2026-03-03
-- Purpose: Defense-in-depth — org-scoped access for tenant isolation
-- Prisma uses postgres superuser (bypasses RLS) so this does NOT affect dashboard operations
-- This protects against direct Supabase client access (PostgREST / anon / authenticated roles)

-- 1. Enable RLS
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- 2. Allow service_role full access (Supabase admin operations, API routes)
CREATE POLICY "service_role_full_access"
  ON leads
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Allow authenticated users to SELECT leads within their organizations
--    Super admins see all orgs via get_user_org_ids(), org members see their org only
--    Dashboard reads: leads page (server component via Prisma, but defense-in-depth)
CREATE POLICY "tenant_select_leads"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    organization_id = ANY(SELECT get_user_org_ids())
  );

-- 4. Allow authenticated users to DELETE leads within their organizations
--    Dashboard: delete lead action (server action via Prisma, but defense-in-depth)
CREATE POLICY "tenant_delete_leads"
  ON leads
  FOR DELETE
  TO authenticated
  USING (
    organization_id = ANY(SELECT get_user_org_ids())
  );

-- 5. No INSERT policy for authenticated role
--    Lead creation happens via POST /api/widget/transcript (unauthenticated widget visitors)
--    That API route uses Prisma (postgres superuser), so no PostgREST INSERT needed
-- 6. No UPDATE policy — leads are immutable after creation

COMMENT ON TABLE leads IS 'RLS enabled. Org-scoped SELECT/DELETE for authenticated users via get_user_org_ids(). INSERT via Prisma only (widget transcript API). No UPDATE.';
