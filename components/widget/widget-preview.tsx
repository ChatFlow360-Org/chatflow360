"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { X, Send } from "lucide-react";
import type { WidgetAppearance } from "@/lib/widget/appearance";

// ─── Chat Icon (matches the real widget SVG) ─────────────────────

function ChatBubbleIcon({ size = 24, fill = "currentColor", dotFill = "#fff" }: { size?: number; fill?: string; dotFill?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill}>
      <path d="M12 2C6.48 2 2 5.92 2 10.5c0 2.55 1.33 4.84 3.42 6.4L4 22l4.35-2.18C9.5 20.27 10.72 20.5 12 20.5c5.52 0 10-3.42 10-7.5S17.52 2 12 2z" />
      <circle cx="8" cy="10.5" r="1.5" fill={dotFill} />
      <circle cx="12" cy="10.5" r="1.5" fill={dotFill} />
      <circle cx="16" cy="10.5" r="1.5" fill={dotFill} />
    </svg>
  );
}

// ─── Types ────────────────────────────────────────────────────────

interface WidgetPreviewProps {
  appearance: Required<WidgetAppearance>;
  activeSection?: "bubble" | "welcome" | "texts" | "colors";
  className?: string;
  /** When true, fills parent height instead of using fixed viewport calc */
  fillHeight?: boolean;
}

const DEFAULT_TEASER = {
  en: { text: "Grow with us!", cta: "Let's Chat!" },
  es: { text: "Crece con nosotros!", cta: "Chatea!" },
};

// ─── Helpers ──────────────────────────────────────────────────────

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function darken(hex: string, factor = 0.85) {
  const { r, g, b } = hexToRgb(hex);
  return `rgb(${Math.round(r * factor)},${Math.round(g * factor)},${Math.round(b * factor)})`;
}

// ─── Sample Messages ─────────────────────────────────────────────

const SAMPLE_MESSAGES = {
  en: [
    { role: "ai" as const, text: "Hi! How can I help you today?" },
    { role: "visitor" as const, text: "What are your business hours?" },
    { role: "ai" as const, text: "We're open Mon-Fri, 9 AM to 6 PM EST. Feel free to ask anything else!" },
  ],
  es: [
    { role: "ai" as const, text: "Hola! Como puedo ayudarte hoy?" },
    { role: "visitor" as const, text: "Cual es su horario de atencion?" },
    { role: "ai" as const, text: "Estamos abiertos de lunes a viernes, 9 AM a 6 PM EST." },
  ],
};

const DEFAULT_TITLES = {
  en: { title: "Chat with us", subtitle: "We typically reply instantly" },
  es: { title: "Chatea con nosotros", subtitle: "Normalmente respondemos al instante" },
};

const DEFAULT_WELCOME = {
  en: { title: "Chat with us", subtitle: "Send us a message to get started." },
  es: { title: "Chatea con nosotros", subtitle: "Envíanos un mensaje para comenzar." },
};

// ─── Component ────────────────────────────────────────────────────

export function WidgetPreview({ appearance, activeSection, className, fillHeight }: WidgetPreviewProps) {
  const t = useTranslations("settings.widgetAppearance");
  const [previewLang, setPreviewLang] = useState<"en" | "es">("en");

  const hc = appearance.headerColor;
  const hic = appearance.headerIconColor;
  const bc = appearance.bubbleColor;
  const bic = appearance.bubbleIconColor;
  const vbg = appearance.visitorBubbleBg;
  const vbt = appearance.visitorBubbleText;
  const abg = appearance.aiBubbleBg;
  const abt = appearance.aiBubbleText;
  const sbc = appearance.sendButtonColor;
  const sqc = appearance.starterQuestionColor;

  const title =
    (previewLang === "es" ? appearance.headerTitleEs : appearance.headerTitleEn) ||
    DEFAULT_TITLES[previewLang].title;
  const subtitle =
    (previewLang === "es" ? appearance.headerSubtitleEs : appearance.headerSubtitleEn) ||
    DEFAULT_TITLES[previewLang].subtitle;

  const welcomeTitle =
    (previewLang === "es" ? appearance.welcomeTitleEs : appearance.welcomeTitleEn) ||
    DEFAULT_WELCOME[previewLang].title;
  const welcomeSubtitle =
    (previewLang === "es" ? appearance.welcomeSubtitleEs : appearance.welcomeSubtitleEn) ||
    DEFAULT_WELCOME[previewLang].subtitle;

  const showBubble = activeSection === "bubble";
  const showWelcome = activeSection === "welcome";
  const messages = SAMPLE_MESSAGES[previewLang];

  const teaserText =
    (previewLang === "es" ? appearance.teaserTextEs : appearance.teaserTextEn) ||
    DEFAULT_TEASER[previewLang].text;
  const teaserCta =
    (previewLang === "es" ? appearance.teaserCtaEs : appearance.teaserCtaEn) ||
    DEFAULT_TEASER[previewLang].cta;

  return (
    <div className={`${className || ""} ${fillHeight ? "flex flex-col h-full" : ""}`.trim()}>
      {/* Language Toggle */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <span className="text-xs font-medium text-muted-foreground">{t("preview")}</span>
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setPreviewLang("en")}
            className={`h-6 px-2.5 rounded-full text-xs font-medium transition-all ${
              previewLang === "en"
                ? "bg-cta text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setPreviewLang("es")}
            className={`h-6 px-2.5 rounded-full text-xs font-medium transition-all ${
              previewLang === "es"
                ? "bg-cta text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ES
          </button>
        </div>
      </div>

      {/* Widget Replica */}
      <div className={`flex flex-col items-end gap-3 ${fillHeight ? "flex-1 min-h-0" : ""}`} style={fillHeight ? undefined : { height: "calc(100vh - 260px)", minHeight: 400 }}>
        {showBubble ? (
          /* Bubble section — show teaser strip only, centered vertically */
          <div className="flex flex-1 flex-col items-end justify-center w-full gap-6">
            {/* Collapsed state — just the bubble circle */}
            <div
              className="flex items-center justify-end"
              style={{
                overflow: "hidden",
                maxWidth: 86,
                borderRadius: "32px 0 0 32px",
                background: "#fff",
                padding: "6px 25px 6px 10px",
              }}
            >
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 56,
                  height: 56,
                  minWidth: 56,
                  borderRadius: "50%",
                  background: bc,
                  border: `2px solid ${bc}`,
                }}
              >
                <ChatBubbleIcon size={24} fill={bic} dotFill={bc} />
              </div>
            </div>
            {/* Expanded state — full teaser strip */}
            <div
              style={{
                background: "#fff",
                borderRadius: "32px 0 0 32px",
                padding: "8px 5px 8px 10px",
                boxShadow: "0 2px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
                display: "flex",
                flexDirection: "row-reverse",
                alignItems: "center",
                gap: 10,
                position: "relative",
                minWidth: 260,
              }}
            >
              {/* Bubble circle */}
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 48,
                  height: 48,
                  minWidth: 48,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${bc}, ${darken(bc)})`,
                }}
              >
                <ChatBubbleIcon size={22} fill={bic} dotFill={bc} />
              </div>
              {/* Content: text above CTA */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 6, flex: 1, textAlign: "center" }}>
                <span style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.3, whiteSpace: "normal" }}>
                  {teaserText}
                </span>
                <div
                  style={{
                    background: appearance.teaserCtaColor || "#333333",
                    color: "#fff",
                    borderRadius: 24,
                    padding: "10px 24px",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    textAlign: "center",
                  }}
                >
                  {teaserCta}
                </div>
              </div>
            </div>
          </div>
        ) : (
        /* Chat Window — full height */
        <div
          className="w-full overflow-hidden rounded-t-[20px] rounded-b-xl flex flex-col flex-1"
          style={{
            maxWidth: 380,
            boxShadow: "0 8px 48px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div
            className="relative flex items-center gap-3.5 px-5 shrink-0"
            style={{
              background: `linear-gradient(135deg, #1c2e47 0%, ${hc} 100%)`,
              color: "#fff",
              padding: "18px 20px 30px",
              borderRadius: "20px 20px 0 0",
            }}
          >
            {/* Avatar */}
            <div
              className="relative flex items-center justify-center shrink-0"
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
              }}
            >
              <ChatBubbleIcon size={22} fill={hic} dotFill={hc} />
              <span
                className="absolute bottom-0 right-0"
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: "#34d399",
                  border: "2px solid #1c2e47",
                }}
              />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <span
                className="block text-base font-semibold"
                style={{ letterSpacing: "-0.01em", color: "#fff" }}
              >
                {title}
              </span>
              <span
                className="block text-xs mt-0.5"
                style={{ opacity: 0.7, color: "#fff" }}
              >
                {subtitle}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-0.5 shrink-0">
              <div
                className="flex items-center justify-center rounded-lg"
                style={{ padding: 6, opacity: 0.7 }}
              >
                <X size={18} style={{ color: hic }} />
              </div>
            </div>
          </div>

          {/* Messages Area — conditional: welcome screen vs chat */}
          <div
            className="flex-1 flex flex-col overflow-y-auto"
            style={{
              padding: "20px 16px",
              background: "#f8fafc",
              borderRadius: "16px 16px 0 0",
              marginTop: -16,
              position: "relative",
              zIndex: 1,
            }}
          >
            {showWelcome ? (
              /* Welcome Screen View */
              <div className="flex flex-col items-center gap-3 px-4 text-center my-auto">
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: "50%",
                    background: `${bc}22`,
                  }}
                >
                  <ChatBubbleIcon size={28} fill={bc} dotFill="#fff" />
                </div>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#1e293b" }}>
                  {welcomeTitle}
                </span>
                <span style={{ fontSize: 13, color: "#94a3b8", lineHeight: 1.5 }}>
                  {welcomeSubtitle}
                </span>
                {appearance.useStarterQuestions && appearance.starterQuestions.length > 0 && (
                  <div className="flex w-full flex-col gap-2 mt-2">
                    {appearance.starterQuestions
                      .filter((q) =>
                        previewLang === "es"
                          ? q.textEs || q.textEn
                          : q.textEn || q.textEs
                      )
                      .map((q) => {
                        const text =
                          previewLang === "es"
                            ? q.textEs || q.textEn
                            : q.textEn || q.textEs;
                        return (
                          <div
                            key={q.id}
                            style={{
                              padding: "10px 16px",
                              border: `1px solid ${sqc}40`,
                              borderRadius: 20,
                              fontSize: 13,
                              color: sqc,
                              background: `${sqc}08`,
                              cursor: "pointer",
                              textAlign: "left",
                              transition: "background 0.15s",
                            }}
                          >
                            {text}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            ) : (
              /* Chat View */
              <div className="flex flex-col gap-1.5 mt-auto">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex flex-col ${
                      msg.role === "visitor" ? "items-end" : "items-start"
                    }`}
                    style={{ marginBottom: 2 }}
                  >
                    <div
                      style={{
                        maxWidth: "78%",
                        padding: "10px 16px",
                        fontSize: 14,
                        lineHeight: 1.5,
                        letterSpacing: "-0.01em",
                        wordWrap: "break-word",
                        borderRadius:
                          msg.role === "visitor"
                            ? "20px 20px 6px 20px"
                            : "20px 20px 20px 6px",
                        background: msg.role === "visitor" ? vbg : abg,
                        color: msg.role === "visitor" ? vbt : abt,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                <div className="flex flex-col items-start" style={{ marginBottom: 2 }}>
                  <div
                    className="flex items-end gap-1"
                    style={{
                      padding: "14px 20px",
                      background: abg,
                      borderRadius: "20px 20px 20px 6px",
                      minHeight: 44,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="inline-block rounded-full"
                        style={{
                          width: 7,
                          height: 7,
                          background: sbc,
                          opacity: 0.6,
                          animation: `cf360PreviewWave 1.3s cubic-bezier(0.4,0,0.2,1) infinite`,
                          animationDelay: `${i * 0.15}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div
            className="flex items-center gap-2.5 shrink-0"
            style={{
              padding: "12px 14px",
              background: "#fff",
              borderTop: "1px solid #f1f5f9",
            }}
          >
            <div
              className="flex-1"
              style={{
                border: "1px solid #e2e8f0",
                borderRadius: 24,
                padding: "0 18px",
                fontSize: 14,
                height: 42,
                lineHeight: "42px",
                background: "#f1f5f9",
                color: "#94a3b8",
              }}
            >
              {previewLang === "es" ? "Escribe un mensaje..." : "Type a message..."}
            </div>
            <div
              className="flex items-center justify-center shrink-0"
              style={{
                width: 42,
                height: 42,
                borderRadius: "50%",
                background: sbc,
                color: "#fff",
                boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
              }}
            >
              <Send size={18} />
            </div>
          </div>

          {/* Footer */}
          <div
            className="text-center shrink-0"
            style={{
              padding: 8,
              fontSize: 11,
              color: "#94a3b8",
              background: "#fff",
            }}
          >
            {previewLang === "es" ? "Impulsado por" : "Powered by"}{" "}
            <span className="font-semibold">ChatFlow360</span>
          </div>
        </div>
        )}
      </div>

      {/* Keyframe for typing dots */}
      <style>{`
        @keyframes cf360PreviewWave {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
