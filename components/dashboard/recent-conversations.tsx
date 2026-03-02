"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Star, MessageSquare } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import type { ConversationStatus, ResponderMode } from "@/types";

interface RecentConversation {
  id: string;
  visitorName: string;
  status: string;
  responderMode: string;
  lastMessageAt: Date;
  lastMessage: string | null;
  channelName: string;
  messageCount: number;
  rating: number | null;
}

interface RecentConversationsProps {
  conversations: RecentConversation[];
}

export function RecentConversations({ conversations }: RecentConversationsProps) {
  const t = useTranslations("dashboard");
  const tConv = useTranslations("conversations");
  const locale = useLocale();
  const router = useRouter();

  const statusConfig: Record<ConversationStatus, { label: string; className: string }> = {
    open: { label: tConv("status.open"), className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    pending: { label: tConv("status.pending"), className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    resolved: { label: tConv("status.resolved"), className: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
    closed: { label: tConv("status.closed"), className: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20" },
  };

  const handlerConfig: Record<ResponderMode, { icon: typeof Bot }> = {
    ai: { icon: Bot },
    human: { icon: User },
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
          conversations.map((conv) => {
            const status = statusConfig[conv.status as ConversationStatus] ?? statusConfig.open;
            const handler = handlerConfig[conv.responderMode as ResponderMode] ?? handlerConfig.ai;
            const HandlerIcon = handler.icon;
            const initials = conv.visitorName
              .split(" ")
              .map((n) => n[0])
              .join("");

            return (
              <div
                key={conv.id}
                onClick={() => router.push(`/conversations?open=${conv.id}`)}
                className="flex items-start gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-accent cursor-pointer"
              >
                {/* Avatar */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-brand-light/10">
                  <span className="text-xs font-semibold text-primary-brand-light">
                    {initials}
                  </span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  {/* Row 1: Name + Status + Time */}
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {conv.visitorName}
                    </p>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${status.className}`}>
                      {status.label}
                    </Badge>
                    <span className="ml-auto shrink-0 text-[11px] text-muted-foreground">
                      {formatRelativeTime(conv.lastMessageAt.toISOString(), locale)}
                    </span>
                  </div>

                  {/* Row 2: Last message */}
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {conv.lastMessage ?? "..."}
                  </p>

                  {/* Row 3: Meta — handler, msgs, rating */}
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <HandlerIcon className="h-3 w-3" />
                      {conv.responderMode === "ai" ? tConv("handler.ai") : tConv("handler.human")}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {conv.messageCount}
                    </span>
                    {conv.rating != null && (
                      <span className="inline-flex items-center gap-0.5 text-amber-500">
                        <Star className="h-3 w-3 fill-amber-500" />
                        <span className="font-medium">{conv.rating}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
