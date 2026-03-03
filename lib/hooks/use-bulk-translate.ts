"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

interface TranslatePair {
  sourceText: string;
  direction: "en-to-es" | "es-to-en";
  onTranslated: (text: string) => void;
}

export function useBulkTranslate() {
  const t = useTranslations("common");
  const [loading, setLoading] = useState(false);

  async function translateAll(pairs: TranslatePair[]) {
    const valid = pairs.filter((p) => p.sourceText.trim());
    if (valid.length === 0) return;

    setLoading(true);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          texts: valid.map((p) => ({
            text: p.sourceText.trim(),
            from: p.direction === "en-to-es" ? "en" : "es",
            to: p.direction === "en-to-es" ? "es" : "en",
          })),
        }),
      });
      if (!res.ok) throw new Error("Translation failed");

      const { translations } = await res.json();
      translations.forEach((text: string, i: number) => {
        valid[i].onTranslated(text);
      });

      toast.success(t("translateBulkSuccess", { count: translations.length }));
    } catch {
      toast.error(t("translateError"));
    } finally {
      setLoading(false);
    }
  }

  return { translateAll, loading };
}
