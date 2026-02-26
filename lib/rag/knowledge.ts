import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgeCategory } from "@/lib/knowledge/business-hours";

export interface KnowledgeItem {
  id: string;
  organization_id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  structured_data: Record<string, unknown> | null;
  tokens_used: number;
  created_at: string;
  updated_at: string;
}

/**
 * List all knowledge items for an organization (without embedding column).
 */
export async function listKnowledge(
  organizationId: string
): Promise<KnowledgeItem[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("organization_knowledge")
    .select("id, organization_id, title, content, category, structured_data, tokens_used, created_at, updated_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to list knowledge: ${error.message}`);
  }

  return (data ?? []) as KnowledgeItem[];
}

/**
 * Create a knowledge item with its embedding vector.
 */
export async function createKnowledge(
  organizationId: string,
  title: string,
  content: string,
  embedding: number[],
  tokensUsed: number,
  category: KnowledgeCategory = "free_text",
  structuredData: Record<string, unknown> | null = null
): Promise<KnowledgeItem> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("organization_knowledge")
    .insert({
      organization_id: organizationId,
      title,
      content,
      embedding: JSON.stringify(embedding),
      tokens_used: tokensUsed,
      category,
      structured_data: structuredData,
    })
    .select("id, organization_id, title, content, category, structured_data, tokens_used, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Failed to create knowledge: ${error.message}`);
  }

  return data as KnowledgeItem;
}

/**
 * Update a knowledge item with new content and re-generated embedding.
 * Double-filters by org ID for multi-tenant safety.
 */
export async function updateKnowledge(
  organizationId: string,
  knowledgeId: string,
  title: string,
  content: string,
  embedding: number[],
  tokensUsed: number,
  category?: KnowledgeCategory,
  structuredData?: Record<string, unknown> | null
): Promise<KnowledgeItem> {
  const supabase = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updatePayload: Record<string, any> = {
    title,
    content,
    embedding: JSON.stringify(embedding),
    tokens_used: tokensUsed,
    updated_at: new Date().toISOString(),
  };
  if (category !== undefined) updatePayload.category = category;
  if (structuredData !== undefined) updatePayload.structured_data = structuredData;

  const { data, error } = await supabase
    .from("organization_knowledge")
    .update(updatePayload)
    .eq("id", knowledgeId)
    .eq("organization_id", organizationId)
    .select("id, organization_id, title, content, category, structured_data, tokens_used, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Failed to update knowledge: ${error.message}`);
  }

  return data as KnowledgeItem;
}

/**
 * Delete a knowledge item. Double-filters by org ID for multi-tenant safety.
 */
export async function deleteKnowledge(
  organizationId: string,
  knowledgeId: string
): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("organization_knowledge")
    .delete()
    .eq("id", knowledgeId)
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to delete knowledge: ${error.message}`);
  }
}

/**
 * Count knowledge items for an organization.
 */
export async function getKnowledgeCount(
  organizationId: string
): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("organization_knowledge")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error(`Failed to count knowledge: ${error.message}`);
  }

  return count ?? 0;
}
