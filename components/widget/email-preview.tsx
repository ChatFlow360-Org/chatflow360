"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { PostChatSettings } from "@/lib/widget/post-chat";

// ─── Types ────────────────────────────────────────────────────────

interface EmailPreviewProps {
  settings: Required<PostChatSettings>;
  orgName: string;
}

// ─── Sample Messages ──────────────────────────────────────────────

const SAMPLE_MESSAGES = {
  en: [
    { role: "ai" as const, text: "Hi! How can I help you today?" },
    { role: "visitor" as const, text: "What are your business hours?" },
    { role: "ai" as const, text: "We're open Mon-Fri, 9 AM to 6 PM EST. Feel free to ask anything else!" },
    { role: "visitor" as const, text: "Thanks, that's all I needed!" },
  ],
  es: [
    { role: "ai" as const, text: "¡Hola! ¿En qué puedo ayudarte hoy?" },
    { role: "visitor" as const, text: "¿Cuál es su horario de atención?" },
    { role: "ai" as const, text: "Estamos abiertos de lunes a viernes, 9 AM a 6 PM EST." },
    { role: "visitor" as const, text: "Gracias, eso es todo." },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────

function replaceVars(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
}

// ─── Component ────────────────────────────────────────────────────

export function EmailPreview({ settings, orgName }: EmailPreviewProps) {
  const t = useTranslations("settings.postChat");
  const [lang, setLang] = useState<"en" | "es">("en");

  const vars = {
    visitor_name: lang === "es" ? "María" : "John",
    org_name: orgName || "Your Company",
    date: new Date().toLocaleDateString(lang === "es" ? "es" : "en", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };

  const subject = replaceVars(
    lang === "es" ? settings.emailSubjectEs : settings.emailSubjectEn,
    vars
  );
  const greeting = replaceVars(
    lang === "es" ? settings.emailGreetingEs : settings.emailGreetingEn,
    vars
  );
  const closing = replaceVars(
    lang === "es" ? settings.emailClosingEs : settings.emailClosingEn,
    vars
  );
  const footer = replaceVars(
    lang === "es" ? settings.emailFooterTextEs : settings.emailFooterTextEn,
    vars
  );
  const messages = SAMPLE_MESSAGES[lang];

  return (
    <div className="space-y-3">
      {/* Header: label + lang toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">
          {t("emailPreview")}
        </span>
        <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5">
          <button
            type="button"
            onClick={() => setLang("en")}
            className={`h-6 px-2.5 rounded-full text-xs font-medium transition-all ${
              lang === "en"
                ? "bg-cta text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLang("es")}
            className={`h-6 px-2.5 rounded-full text-xs font-medium transition-all ${
              lang === "es"
                ? "bg-cta text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ES
          </button>
        </div>
      </div>

      {/* Email frame */}
      <div className="rounded-xl border border-border bg-white overflow-hidden shadow-sm">
        {/* Subject bar */}
        <div className="border-b border-border/50 px-4 py-2.5 bg-muted/20">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">
              {lang === "es" ? "Asunto:" : "Subject:"}
            </span>
            <span className="text-foreground/90">{subject}</span>
          </div>
        </div>

        {/* Header with color */}
        <div
          className="px-6 py-5 text-center"
          style={{ backgroundColor: settings.emailHeaderColor }}
        >
          {settings.logoUrl ? (
            <img
              src={settings.logoUrl}
              alt="Logo"
              className="mx-auto h-10 object-contain"
            />
          ) : (
            <div className="text-lg font-semibold text-white">
              {orgName || "Your Company"}
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Greeting */}
          <p className="text-sm text-gray-800">{greeting}</p>

          {/* Intro text */}
          <p className="text-sm text-gray-600">
            {lang === "es"
              ? "Aquí tienes la transcripción de tu conversación:"
              : "Here's the transcript of your conversation:"}
          </p>

          {/* Messages */}
          <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className="flex gap-3">
                <div
                  className="shrink-0 mt-0.5 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{
                    backgroundColor:
                      msg.role === "ai" ? settings.emailHeaderColor : "#2f92ad",
                  }}
                >
                  {msg.role === "ai" ? "AI" : vars.visitor_name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-gray-500">
                    {msg.role === "ai"
                      ? (orgName || "AI Assistant")
                      : vars.visitor_name}
                  </span>
                  <p className="text-sm text-gray-700 mt-0.5">{msg.text}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Closing */}
          <p className="text-sm text-gray-800">{closing}</p>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-3 bg-gray-50 text-center">
          <p className="text-xs text-gray-400">{footer}</p>
        </div>
      </div>
    </div>
  );
}
