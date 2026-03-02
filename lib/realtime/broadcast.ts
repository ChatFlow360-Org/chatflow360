import { deriveTypingChannel } from "@/lib/crypto/channel";

/**
 * Broadcast an event to the widget via Supabase Realtime REST API.
 * Uses the same HMAC-derived channel the widget already subscribes to
 * for typing indicators — no extra connection needed on the widget side.
 *
 * Non-critical: failures are logged but never break the calling action.
 */
export async function broadcastToConversation(
  conversationId: string,
  event: string,
  payload: Record<string, unknown> = {}
): Promise<void> {
  try {
    const channelName = deriveTypingChannel(conversationId);
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) return;

    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        messages: [{ topic: channelName, event, payload }],
      }),
    });

    if (!res.ok) {
      console.warn("[broadcastToConversation] HTTP", res.status);
    }
  } catch (error) {
    console.error("[broadcastToConversation]", error);
  }
}
