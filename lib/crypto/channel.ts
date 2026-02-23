import { createHmac } from "crypto";

const SIGNING_PREFIX = "typing-channel:";

/**
 * Derive an HMAC-signed channel name for Supabase Realtime Broadcast.
 * Uses ENCRYPTION_KEY with a distinct prefix for key separation.
 * Returns a short, unpredictable channel name like "t:a8f3c2e1b9d04f67".
 */
export function deriveTypingChannel(conversationId: string): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY not set");

  const hmac = createHmac("sha256", key);
  hmac.update(SIGNING_PREFIX + conversationId);
  return "t:" + hmac.digest("hex").slice(0, 16);
}
