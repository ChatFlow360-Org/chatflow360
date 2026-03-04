import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────

export interface StarterQuestion {
  id: string;
  textEn: string;
  textEs: string;
}

export interface WidgetAppearance {
  headerTitleEn?: string;
  headerTitleEs?: string;
  headerSubtitleEn?: string;
  headerSubtitleEs?: string;
  welcomeTitleEn?: string;
  welcomeTitleEs?: string;
  welcomeSubtitleEn?: string;
  welcomeSubtitleEs?: string;
  headerColor?: string;
  headerIconColor?: string;
  bubbleColor?: string;
  bubbleIconColor?: string;
  visitorBubbleBg?: string;
  visitorBubbleText?: string;
  aiBubbleBg?: string;
  aiBubbleText?: string;
  sendButtonColor?: string;
  useStarterQuestions?: boolean;
  starterQuestions?: StarterQuestion[];
  // Teaser (2-stage bubble)
  teaserTextEn?: string;
  teaserTextEs?: string;
  teaserCtaEn?: string;
  teaserCtaEs?: string;
  teaserBgColor?: string;
  teaserCtaColor?: string;
  teaserAutoShow?: boolean;
  teaserDelaySeconds?: number;
}

/** Shape of `Channel.config` JSONB (only the widget slice). */
export interface ChannelWidgetConfig {
  widgetAppearance?: WidgetAppearance;
}

// ─── Defaults ─────────────────────────────────────────────────────

export const DEFAULT_WIDGET_APPEARANCE: Required<WidgetAppearance> = {
  headerTitleEn: "",           // empty = use widget's built-in i18n default
  headerTitleEs: "",
  headerSubtitleEn: "",        // empty = use widget's built-in i18n default
  headerSubtitleEs: "",
  welcomeTitleEn: "",          // empty = use widget's built-in i18n default
  welcomeTitleEs: "",
  welcomeSubtitleEn: "",       // empty = use widget's built-in i18n default
  welcomeSubtitleEs: "",
  headerColor: "#1c2e47",
  headerIconColor: "#ffffff",
  bubbleColor: "#2f92ad",
  bubbleIconColor: "#ffffff",
  visitorBubbleBg: "#2f92ad",
  visitorBubbleText: "#ffffff",
  aiBubbleBg: "#e8ecf1",
  aiBubbleText: "#1e293b",
  sendButtonColor: "#2f92ad",
  useStarterQuestions: false,
  starterQuestions: [],
  teaserTextEn: "",              // empty = use widget fallback "Grow with us!"
  teaserTextEs: "",
  teaserCtaEn: "",               // empty = use widget fallback "Let's Chat!"
  teaserCtaEs: "",
  teaserBgColor: "#2f92ad",            // matches bubbleColor default
  teaserCtaColor: "#333333",
  teaserAutoShow: false,
  teaserDelaySeconds: 5,
};

// ─── Zod Schema ───────────────────────────────────────────────────

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (#RRGGBB)");

const starterQuestionSchema = z.object({
  id: z.string().min(1),
  textEn: z.string().max(100),
  textEs: z.string().max(100),
});

export const widgetAppearanceSchema = z.object({
  headerTitleEn: z.string().max(40).optional().default(""),
  headerTitleEs: z.string().max(40).optional().default(""),
  headerSubtitleEn: z.string().max(60).optional().default(""),
  headerSubtitleEs: z.string().max(60).optional().default(""),
  welcomeTitleEn: z.string().max(60).optional().default(""),
  welcomeTitleEs: z.string().max(60).optional().default(""),
  welcomeSubtitleEn: z.string().max(80).optional().default(""),
  welcomeSubtitleEs: z.string().max(80).optional().default(""),
  headerColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.headerColor),
  headerIconColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.headerIconColor),
  bubbleColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.bubbleColor),
  bubbleIconColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.bubbleIconColor),
  visitorBubbleBg: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.visitorBubbleBg),
  visitorBubbleText: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.visitorBubbleText),
  aiBubbleBg: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.aiBubbleBg),
  aiBubbleText: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.aiBubbleText),
  sendButtonColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.sendButtonColor),
  useStarterQuestions: z.boolean().optional().default(false),
  starterQuestions: z.array(starterQuestionSchema).max(5).optional().default([]),
  teaserTextEn: z.string().max(80).optional().default(""),
  teaserTextEs: z.string().max(80).optional().default(""),
  teaserCtaEn: z.string().max(30).optional().default(""),
  teaserCtaEs: z.string().max(30).optional().default(""),
  teaserBgColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.teaserBgColor),
  teaserCtaColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.teaserCtaColor),
  teaserAutoShow: z.boolean().optional().default(false),
  teaserDelaySeconds: z.number().int().min(3).max(30).optional().default(5),
});

// ─── Resolver ─────────────────────────────────────────────────────

/**
 * Merge stored appearance overrides with defaults.
 * Any field that is empty string or missing falls back to the default.
 *
 * Also migrates legacy `headerTitle` / `headerSubtitle` fields
 * (pre-bilingual) into the new `*En` keys so existing data keeps working.
 */
export function resolveAppearance(
  config: Record<string, unknown> | null | undefined,
): Required<WidgetAppearance> {
  const stored = (config as ChannelWidgetConfig | null)?.widgetAppearance;
  if (!stored) return { ...DEFAULT_WIDGET_APPEARANCE };

  // Migrate legacy single-language fields
  const compat = { ...stored } as Record<string, string | undefined>;
  if (compat.headerTitle && !compat.headerTitleEn) {
    compat.headerTitleEn = compat.headerTitle;
  }
  if (compat.headerSubtitle && !compat.headerSubtitleEn) {
    compat.headerSubtitleEn = compat.headerSubtitle;
  }

  const resolved = { ...DEFAULT_WIDGET_APPEARANCE };
  for (const key of Object.keys(DEFAULT_WIDGET_APPEARANCE) as (keyof WidgetAppearance)[]) {
    if (key === "useStarterQuestions" || key === "teaserAutoShow") {
      if (typeof compat[key] === "boolean") {
        (resolved as Record<string, unknown>)[key] = compat[key];
      }
    } else if (key === "teaserDelaySeconds") {
      const num = (stored as Record<string, unknown>)?.[key];
      if (typeof num === "number" && num >= 3 && num <= 30) {
        (resolved as Record<string, unknown>)[key] = num;
      }
    } else if (key === "starterQuestions") {
      const arr = (stored as Record<string, unknown>)?.[key];
      if (Array.isArray(arr)) {
        (resolved as Record<string, unknown>)[key] = arr;
      }
    } else {
      const val = compat[key];
      if (val && typeof val === "string" && val.length > 0) {
        (resolved as Record<string, unknown>)[key] = val;
      }
    }
  }
  return resolved;
}
