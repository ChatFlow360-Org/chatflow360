"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Copy, Check, Code2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// ─── Types ────────────────────────────────────────────────────────

interface EmbedCodeCardProps {
  publicKey: string;
}

// ─── Component ────────────────────────────────────────────────────

export function EmbedCodeCard({ publicKey }: EmbedCodeCardProps) {
  const t = useTranslations("settings.widgetAppearance");
  const [embedLang, setEmbedLang] = useState<"en" | "es">("en");
  const [copied, setCopied] = useState(false);

  const langAttr = embedLang === "es" ? '\n  data-lang="es"' : "";
  const code = `<script\n  src="https://app.chatflow360.com/widget/chatflow360.js"\n  data-key="${publicKey}"${langAttr}\n  defer><\/script>`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Code2 className="h-4 w-4 text-muted-foreground" />
              {t("embedTitle")}
            </CardTitle>
            <CardDescription className="text-xs">
              {t("embedDescription")}
            </CardDescription>
          </div>
          {/* Language Toggle */}
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setEmbedLang("en")}
              className={`h-6 px-2.5 rounded-full text-xs font-medium transition-all ${
                embedLang === "en"
                  ? "bg-cta text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setEmbedLang("es")}
              className={`h-6 px-2.5 rounded-full text-xs font-medium transition-all ${
                embedLang === "es"
                  ? "bg-cta text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              ES
            </button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Code Block */}
        <div className="relative rounded-lg bg-muted/60 dark:bg-muted/30 border border-border/50 p-4">
          <pre className="text-xs font-mono leading-relaxed text-foreground/90 overflow-x-auto whitespace-pre">
            {code}
          </pre>
        </div>

        {/* Copy Button */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCopy}
          className="w-full"
        >
          {copied ? (
            <>
              <Check className="mr-1.5 h-4 w-4 text-emerald-500" />
              {t("copied")}
            </>
          ) : (
            <>
              <Copy className="mr-1.5 h-4 w-4" />
              {t("copyCode")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
