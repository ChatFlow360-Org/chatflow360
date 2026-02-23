import { createAdminClient } from "@/lib/supabase/admin";

export interface KnowledgeItem {
  id: string;
  organization_id: string;
  title: string;
  content: string;
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
    .select("id, organization_id, title, content, tokens_used, created_at, updated_at")
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
  tokensUsed: number
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
    })
    .select("id, organization_id, title, content, tokens_used, created_at, updated_at")
    .single();

  if (error) {
    throw new Error(`Failed to create knowledge: ${error.message}`);
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
