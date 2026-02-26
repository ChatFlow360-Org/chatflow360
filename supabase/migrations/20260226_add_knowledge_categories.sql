-- Migration: Add category + structured_data to organization_knowledge
-- Date: 2026-02-26
-- Purpose: Smart Knowledge Categories (business_hours, pricing, FAQ, etc.)
-- Backward compatible: existing items get 'free_text' + NULL structured_data

ALTER TABLE organization_knowledge
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) NOT NULL DEFAULT 'free_text',
  ADD COLUMN IF NOT EXISTS structured_data JSONB;

-- Index for filtering by category
CREATE INDEX IF NOT EXISTS idx_org_knowledge_category
  ON organization_knowledge (organization_id, category);

-- Constraint: only one business_hours per org (unique per category that's not free_text)
CREATE UNIQUE INDEX IF NOT EXISTS idx_org_knowledge_unique_category
  ON organization_knowledge (organization_id, category)
  WHERE category != 'free_text';

COMMENT ON COLUMN organization_knowledge.category IS 'Knowledge type: free_text (default), business_hours, pricing, faq, etc.';
COMMENT ON COLUMN organization_knowledge.structured_data IS 'JSON structure for category-specific forms (e.g. BusinessHoursData). NULL for free_text.';
