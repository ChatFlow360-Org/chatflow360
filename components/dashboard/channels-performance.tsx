"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const pages = [
  { name: "/services", chats: 847, color: "bg-emerald-400" },
  { name: "/pricing", chats: 312, color: "bg-primary-brand-light" },
  { name: "/contact", chats: 88, color: "bg-amber-400" },
];

export function TopPages() {
  const t = useTranslations("dashboard");

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-0">
        <CardTitle className="text-base font-semibold">{t("topPages")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="space-y-0">
          {pages.map((page, i) => (
            <div
              key={page.name}
              className={`flex items-center justify-between px-0 py-3 ${
                i % 2 === 1 ? "rounded-md bg-primary-brand-light/5" : ""
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className={`h-2 w-2 rounded-sm ${page.color}`} />
                <span className="text-[13px] font-mono text-foreground">{page.name}</span>
              </div>
              <span className="text-[13px] text-muted-foreground">{t("visits", { count: page.chats })}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
