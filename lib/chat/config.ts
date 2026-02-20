import type { Channel, AiSettings } from "@/lib/generated/prisma/client";

export interface ResolvedChatConfig {
  // Technical (always from AiSettings -- super admin controls)
  provider: string;
  model: string;
  temperature: number;
  maxTokens: number;
  // Business (channel override -> org fallback)
  systemPrompt: string | null;
  handoffEnabled: boolean;
  handoffKeywords: string[];
}

/**
 * Resolve effective chat configuration.
 * Technical params always come from org AiSettings.
 * Business params can be overridden at channel level.
 */
export function resolveChannelConfig(
  channel: Pick<Channel, "systemPrompt" | "handoffEnabled" | "handoffKeywords">,
  aiSettings: Pick<AiSettings, "provider" | "model" | "temperature" | "maxTokens" | "systemPrompt" | "handoffKeywords"> | null
): ResolvedChatConfig {
  const defaults = {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxTokens: 500,
  };

  return {
    // Technical: always from AiSettings (or defaults)
    provider: aiSettings?.provider ?? defaults.provider,
    model: aiSettings?.model ?? defaults.model,
    temperature: Number(aiSettings?.temperature ?? defaults.temperature),
    maxTokens: aiSettings?.maxTokens ?? defaults.maxTokens,
    // Business: channel override -> org fallback
    systemPrompt: channel.systemPrompt ?? aiSettings?.systemPrompt ?? null,
    handoffEnabled: channel.handoffEnabled,
    handoffKeywords: channel.handoffKeywords.length > 0
      ? channel.handoffKeywords
      : (aiSettings?.handoffKeywords ?? []),
  };
}
