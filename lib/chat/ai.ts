import type OpenAI from "openai";
import type { ResolvedChatConfig } from "./config";

interface ChatMessage {
  senderType: string; // "visitor" | "ai" | "agent"
  content: string;
}

interface AiResponse {
  content: string;
  tokensUsed: number;
}

/**
 * Build OpenAI messages array from conversation history.
 * Maps senderType to OpenAI roles: visitor->user, ai/agent->assistant
 */
function buildMessages(
  config: ResolvedChatConfig,
  history: ChatMessage[],
  newMessage: string
): OpenAI.ChatCompletionMessageParam[] {
  const messages: OpenAI.ChatCompletionMessageParam[] = [];

  // System prompt
  if (config.systemPrompt) {
    messages.push({ role: "system", content: config.systemPrompt });
  }

  // Last 20 messages for context (avoid token overflow)
  const recentHistory = history.slice(-20);
  for (const msg of recentHistory) {
    messages.push({
      role: msg.senderType === "visitor" ? "user" : "assistant",
      content: msg.content,
    });
  }

  // New visitor message
  messages.push({ role: "user", content: newMessage });

  return messages;
}

/**
 * Generate an AI response using OpenAI.
 */
export async function generateAiResponse(
  client: OpenAI,
  config: ResolvedChatConfig,
  history: ChatMessage[],
  visitorMessage: string
): Promise<AiResponse> {
  const messages = buildMessages(config, history, visitorMessage);

  const completion = await client.chat.completions.create({
    model: config.model,
    messages,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
  });

  const choice = completion.choices[0];
  const content = choice?.message?.content || "I'm sorry, I couldn't generate a response.";
  const tokensUsed = completion.usage?.total_tokens || 0;

  return { content, tokensUsed };
}
