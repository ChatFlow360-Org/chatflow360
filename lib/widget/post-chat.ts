import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────

export interface PostChatSettings {
  enableTranscript?: boolean;
  enableRating?: boolean;
  ccEmail?: string;
  logoUrl?: string;
  emailSubjectEn?: string;
  emailSubjectEs?: string;
  emailGreetingEn?: string;
  emailGreetingEs?: string;
  emailClosingEn?: string;
  emailClosingEs?: string;
  emailHeaderColor?: string;
  emailFooterTextEn?: string;
  emailFooterTextEs?: string;
}

/** Extends ChannelWidgetConfig to include postChat slice. */
export interface ChannelPostChatConfig {
  postChatSettings?: PostChatSettings;
}

// ─── Defaults ─────────────────────────────────────────────────────

export const DEFAULT_POST_CHAT: Required<PostChatSettings> = {
  enableTranscript: true,
  enableRating: true,
  ccEmail: "",
  logoUrl: "",
  emailSubjectEn: "Your conversation transcript",
  emailSubjectEs: "Transcripción de tu conversación",
  emailGreetingEn: "Hi {{visitor_name}},",
  emailGreetingEs: "Hola {{visitor_name}},",
  emailClosingEn: "Thank you for chatting with us!",
  emailClosingEs: "¡Gracias por chatear con nosotros!",
  emailHeaderColor: "#1c2e47",
  emailFooterTextEn: "This transcript was sent from {{org_name}}",
  emailFooterTextEs: "Esta transcripción fue enviada desde {{org_name}}",
};

// ─── Template Variables ───────────────────────────────────────────

/** Supported variables for email template fields */
export const TEMPLATE_VARIABLES = [
  "{{visitor_name}}",
  "{{org_name}}",
  "{{date}}",
] as const;

// ─── Zod Schema ───────────────────────────────────────────────────

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (#RRGGBB)");

export const postChatSchema = z.object({
  enableTranscript: z.boolean().optional().default(true),
  enableRating: z.boolean().optional().default(true),
  ccEmail: z.union([
    z.string().email(),
    z.literal(""),
  ]).optional().default(""),
  logoUrl: z.string().max(500).optional().default(""),
  emailSubjectEn: z.string().max(100).optional().default(DEFAULT_POST_CHAT.emailSubjectEn),
  emailSubjectEs: z.string().max(100).optional().default(DEFAULT_POST_CHAT.emailSubjectEs),
  emailGreetingEn: z.string().max(200).optional().default(DEFAULT_POST_CHAT.emailGreetingEn),
  emailGreetingEs: z.string().max(200).optional().default(DEFAULT_POST_CHAT.emailGreetingEs),
  emailClosingEn: z.string().max(200).optional().default(DEFAULT_POST_CHAT.emailClosingEn),
  emailClosingEs: z.string().max(200).optional().default(DEFAULT_POST_CHAT.emailClosingEs),
  emailHeaderColor: hexColor.optional().default(DEFAULT_POST_CHAT.emailHeaderColor),
  emailFooterTextEn: z.string().max(200).optional().default(DEFAULT_POST_CHAT.emailFooterTextEn),
  emailFooterTextEs: z.string().max(200).optional().default(DEFAULT_POST_CHAT.emailFooterTextEs),
});

// ─── Resolver ─────────────────────────────────────────────────────

export function resolvePostChat(
  config: Record<string, unknown> | null | undefined,
): Required<PostChatSettings> {
  const stored = (config as ChannelPostChatConfig | null)?.postChatSettings;
  if (!stored) return { ...DEFAULT_POST_CHAT };

  return {
    enableTranscript: stored.enableTranscript ?? DEFAULT_POST_CHAT.enableTranscript,
    enableRating: stored.enableRating ?? DEFAULT_POST_CHAT.enableRating,
    ccEmail: stored.ccEmail || DEFAULT_POST_CHAT.ccEmail,
    logoUrl: stored.logoUrl || DEFAULT_POST_CHAT.logoUrl,
    emailSubjectEn: stored.emailSubjectEn || DEFAULT_POST_CHAT.emailSubjectEn,
    emailSubjectEs: stored.emailSubjectEs || DEFAULT_POST_CHAT.emailSubjectEs,
    emailGreetingEn: stored.emailGreetingEn || DEFAULT_POST_CHAT.emailGreetingEn,
    emailGreetingEs: stored.emailGreetingEs || DEFAULT_POST_CHAT.emailGreetingEs,
    emailClosingEn: stored.emailClosingEn || DEFAULT_POST_CHAT.emailClosingEn,
    emailClosingEs: stored.emailClosingEs || DEFAULT_POST_CHAT.emailClosingEs,
    emailHeaderColor: stored.emailHeaderColor || DEFAULT_POST_CHAT.emailHeaderColor,
    emailFooterTextEn: stored.emailFooterTextEn || DEFAULT_POST_CHAT.emailFooterTextEn,
    emailFooterTextEs: stored.emailFooterTextEs || DEFAULT_POST_CHAT.emailFooterTextEs,
  };
}
