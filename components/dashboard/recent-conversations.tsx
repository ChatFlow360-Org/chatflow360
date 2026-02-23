"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatRelativeTime } from "@/lib/utils/format";
import type { ConversationStatus } from "@/types";

interface RecentConversation {
  id: string;
  visitorId: string | null;
  status: string;
  lastMessageAt: Date;
  lastMessage: string | null;
  channelName: string;
}

interface RecentConversationsProps {
  conversations: RecentConversation[];
}

export function RecentConversations({ conversations }: RecentConversationsProps) {
  const t = useTranslations("dashboard");
  const tConv = useTranslations("conversations");
  const locale = useLocale();

  const statusConfig: Record<ConversationStatus, { label: string; className: string }> = {
    open: { label: tConv("status.open"), className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    pending: { label: tConv("status.pending"), className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    resolved: { label: tConv("status.resolved"), className: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
    closed: { label: tConv("status.closed"), className: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20" },
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">{t("recentConversations")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        {conversations.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t("noConversationsYet")}</p>
        ) : (
          conversations.map((conv, i) => {
            const status = statusConfig[conv.status as ConversationStatus] ?? statusConfig.open;
            const initials = conv.visitorId
              ? conv.visitorId.slice(0, 2).toUpperCase()
              : "??";
            return (
              <div
                key={conv.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent ${
                  i % 2 === 0 ? "bg-muted/60" : ""
                }`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-brand-light/10">
                  <span className="text-sm font-medium text-primary-brand-light">
                    {initials}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">
                      {conv.channelName}
                    </p>
                    <span className="text-[11px] text-muted-foreground">
                      {formatRelativeTime(conv.lastMessageAt.toISOString(), locale)}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {conv.lastMessage ?? "..."}
                  </p>
                </div>
                <Badge variant="outline" className={status.className}>
                  {status.label}
                </Badge>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
