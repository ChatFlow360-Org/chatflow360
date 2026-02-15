"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { mockConversations } from "@/lib/mock/data";
import { formatRelativeTime } from "@/lib/utils/format";
import type { ConversationStatus } from "@/types";

export function RecentConversations() {
  const t = useTranslations("dashboard");
  const tConv = useTranslations("conversations");
  const locale = useLocale();

  const statusConfig: Record<ConversationStatus, { label: string; className: string }> = {
    active: { label: tConv("status.active"), className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    waiting: { label: tConv("status.waiting"), className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    closed: { label: tConv("status.closed"), className: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20" },
  };

  const recent = mockConversations.slice(0, 5);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t("recentConversations")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {recent.map((conv, i) => {
          const status = statusConfig[conv.status];
          return (
            <div
              key={conv.id}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent ${
                i % 2 === 0 ? "bg-muted/60" : ""
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-brand-light/10">
                <span className="text-sm font-medium text-primary-brand-light">
                  {conv.visitorName.split(" ").map((n) => n[0]).join("")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">{conv.visitorName}</p>
                  <span className="text-[11px] text-muted-foreground">
                    {formatRelativeTime(conv.lastMessageAt, locale)}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{conv.lastMessage}</p>
              </div>
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
