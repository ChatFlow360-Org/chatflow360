import { z } from "zod";

// ─── Types ────────────────────────────────────────────────────────

export interface WidgetAppearance {
  headerTitle?: string;
  headerSubtitle?: string;
  headerColor?: string;
  headerIconColor?: string;
  bubbleColor?: string;
  bubbleIconColor?: string;
  visitorBubbleBg?: string;
  visitorBubbleText?: string;
  aiBubbleBg?: string;
  aiBubbleText?: string;
  sendButtonColor?: string;
}

/** Shape of `Channel.config` JSONB (only the widget slice). */
export interface ChannelWidgetConfig {
  widgetAppearance?: WidgetAppearance;
}

// ─── Defaults ─────────────────────────────────────────────────────

export const DEFAULT_WIDGET_APPEARANCE: Required<WidgetAppearance> = {
  headerTitle: "",           // empty = use widget's built-in i18n default
  headerSubtitle: "",        // empty = use widget's built-in i18n default
  headerColor: "#1c2e47",
  headerIconColor: "#ffffff",
  bubbleColor: "#2f92ad",
  bubbleIconColor: "#ffffff",
  visitorBubbleBg: "#2f92ad",
  visitorBubbleText: "#ffffff",
  aiBubbleBg: "#e8ecf1",
  aiBubbleText: "#1e293b",
  sendButtonColor: "#2f92ad",
};

// ─── Zod Schema ───────────────────────────────────────────────────

const hexColor = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color (#RRGGBB)");

export const widgetAppearanceSchema = z.object({
  headerTitle: z.string().max(40).optional().default(""),
  headerSubtitle: z.string().max(60).optional().default(""),
  headerColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.headerColor),
  headerIconColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.headerIconColor),
  bubbleColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.bubbleColor),
  bubbleIconColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.bubbleIconColor),
  visitorBubbleBg: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.visitorBubbleBg),
  visitorBubbleText: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.visitorBubbleText),
  aiBubbleBg: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.aiBubbleBg),
  aiBubbleText: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.aiBubbleText),
  sendButtonColor: hexColor.optional().default(DEFAULT_WIDGET_APPEARANCE.sendButtonColor),
});

// ─── Resolver ─────────────────────────────────────────────────────

/**
 * Merge stored appearance overrides with defaults.
 * Any field that is empty string or missing falls back to the default.
 */
export function resolveAppearance(
  config: Record<string, unknown> | null | undefined,
): Required<WidgetAppearance> {
  const stored = (config as ChannelWidgetConfig | null)?.widgetAppearance;
  if (!stored) return { ...DEFAULT_WIDGET_APPEARANCE };

  const resolved = { ...DEFAULT_WIDGET_APPEARANCE };
  for (const key of Object.keys(DEFAULT_WIDGET_APPEARANCE) as (keyof WidgetAppearance)[]) {
    const val = stored[key];
    if (val && val.length > 0) {
      (resolved as Record<string, string>)[key] = val;
    }
  }
  return resolved;
}
