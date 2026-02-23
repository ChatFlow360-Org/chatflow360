import type OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";

interface EmbeddingResult {
  embedding: number[];
  tokensUsed: number;
}

/**
 * Generate an embedding vector for the given text using OpenAI.
 * Model: text-embedding-3-small (1536 dimensions).
 */
export async function generateEmbedding(
  client: OpenAI,
  text: string
): Promise<EmbeddingResult> {
  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });

  return {
    embedding: response.data[0].embedding,
    tokensUsed: response.usage.total_tokens,
  };
}
