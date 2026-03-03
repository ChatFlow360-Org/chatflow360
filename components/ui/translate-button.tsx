"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Languages, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TranslateButtonProps {
  sourceText: string;
  direction: "en-to-es" | "es-to-en";
  onTranslated: (text: string) => void;
  className?: string;
}

export function TranslateButton({
  sourceText,
  direction,
  onTranslated,
  className,
}: TranslateButtonProps) {
  const t = useTranslations("common");
  const [loading, setLoading] = useState(false);
  const disabled = !sourceText.trim() || loading;

  const tooltipText =
    direction === "en-to-es" ? t("translateFromEn") : t("translateFromEs");

  async function handleTranslate() {
    if (disabled) return;
    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: [
            {
              text: sourceText.trim(),
              from: direction === "en-to-es" ? "en" : "es",
              to: direction === "en-to-es" ? "es" : "en",
            },
          ],
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Translation failed");
      }
      const { translations } = await res.json();
      if (translations?.[0]) {
        onTranslated(translations[0]);
      }
    } catch {
      toast.error(t("translateError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={disabled}
          onClick={handleTranslate}
          className={className}
        >
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Languages className="h-3 w-3" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">{tooltipText}</TooltipContent>
    </Tooltip>
  );
}
