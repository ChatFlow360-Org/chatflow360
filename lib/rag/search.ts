import { createAdminClient } from "@/lib/supabase/admin";

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  content: string;
  similarity: number;
}

interface SearchOptions {
  threshold?: number;
  limit?: number;
}

/**
 * Semantic search across organization knowledge using cosine similarity.
 * Calls the `search_organization_knowledge` Postgres function via Supabase RPC.
 */
export async function searchKnowledge(
  organizationId: string,
  queryEmbedding: number[],
  options?: SearchOptions
): Promise<KnowledgeSearchResult[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("search_organization_knowledge", {
    p_organization_id: organizationId,
    p_query_embedding: JSON.stringify(queryEmbedding),
    p_match_threshold: options?.threshold ?? 0.5,
    p_match_count: options?.limit ?? 5,
  });

  if (error) {
    throw new Error(`Knowledge search failed: ${error.message}`);
  }

  return (data ?? []) as KnowledgeSearchResult[];
}
