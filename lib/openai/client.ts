import OpenAI from "openai";
import { prisma } from "@/lib/db/prisma";
import { decrypt } from "@/lib/crypto/encryption";

/**
 * Resolve the OpenAI API key for a given organization.
 * Priority: per-org encrypted key → global platform key → env var
 */
export async function resolveApiKey(organizationId: string): Promise<string> {
  // 1. Check per-org key
  const aiSettings = await prisma.aiSettings.findUnique({
    where: { organizationId },
    select: { encryptedApiKey: true },
  });

  if (aiSettings?.encryptedApiKey) {
    return decrypt(aiSettings.encryptedApiKey);
  }

  // 2. Check global platform key
  const platformKey = await prisma.platformSettings.findUnique({
    where: { key: "openai_api_key" },
    select: { value: true },
  });

  if (platformKey?.value) {
    return decrypt(platformKey.value);
  }

  // 3. Fallback to env var
  const envKey = process.env.OPENAI_API_KEY;
  if (envKey) {
    return envKey;
  }

  throw new Error("No OpenAI API key configured");
}

/**
 * Create an OpenAI client for a specific organization.
 */
export async function createOpenAIClient(organizationId: string): Promise<OpenAI> {
  const apiKey = await resolveApiKey(organizationId);
  return new OpenAI({ apiKey });
}
