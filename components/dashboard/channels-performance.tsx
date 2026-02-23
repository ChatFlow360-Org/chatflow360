"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BAR_COLORS = [
  "bg-emerald-400",
  "bg-primary-brand-light",
  "bg-amber-400",
  "bg-sky-400",
  "bg-rose-400",
];

interface TopPagesProps {
  pages: { page: string; count: number }[];
}

export function TopPages({ pages }: TopPagesProps) {
  const t = useTranslations("dashboard");

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">{t("topPages")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {pages.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">{t("noPages")}</p>
        ) : (
          <div className="space-y-0">
            {pages.map((page, i) => (
              <div
                key={page.page}
                className={`flex items-center justify-between px-0 py-3 ${
                  i % 2 === 1 ? "rounded-md bg-primary-brand-light/5" : ""
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`h-2 w-2 rounded-sm ${BAR_COLORS[i % BAR_COLORS.length]}`} />
                  <span className="text-[13px] font-mono text-foreground">{page.page}</span>
                </div>
                <span className="text-[13px] text-muted-foreground">{t("visits", { count: page.count })}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
