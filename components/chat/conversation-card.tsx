"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bot, User } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { formatRelativeTime } from "@/lib/utils/format";
import type { Conversation, ConversationStatus, ResponderMode } from "@/types";
import { cn } from "@/lib/utils";

interface ConversationCardProps {
  conversation: Conversation;
  isSelected?: boolean;
  onClick?: () => void;
}

export function ConversationCard({ conversation, isSelected, onClick }: ConversationCardProps) {
  const t = useTranslations("conversations");
  const locale = useLocale();

  const statusConfig: Record<ConversationStatus, { label: string; className: string }> = {
    open: { label: t("status.open"), className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    pending: { label: t("status.pending"), className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    resolved: { label: t("status.resolved"), className: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
    closed: { label: t("status.closed"), className: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20" },
  };

  const handlerConfig: Record<ResponderMode, { label: string; icon: typeof Bot }> = {
    ai: { label: t("handler.ai"), icon: Bot },
    human: { label: t("handler.human"), icon: User },
  };

  const status = statusConfig[conversation.status];
  const handler = handlerConfig[conversation.responderMode];
  const HandlerIcon = handler.icon;

  return (
    <Card
      className={cn(
        "cursor-pointer border-border bg-card transition-all hover:-translate-y-0.5 hover:border-cta/30",
        isSelected && "border-cta ring-1 ring-cta/20",
        (conversation.status === "closed" || conversation.status === "resolved") && "opacity-60"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        {/* Header: Name + Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-brand-light/10">
              <span className="text-xs font-semibold text-primary-brand-light">
                {conversation.visitorName.split(" ").map((n) => n[0]).join("")}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">{conversation.visitorName}</p>
          </div>
          <Badge variant="outline" className={cn("text-[10px]", status.className)}>
            {status.label}
          </Badge>
        </div>

        {/* Message Preview */}
        <p className="mt-3 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {conversation.lastMessage}
        </p>

        <Separator className="my-3" />

        {/* Footer: Handler + Meta */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <HandlerIcon className="h-3 w-3" />
            <span>{handler.label}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>{t("msgs", { count: conversation.messageCount })}</span>
            <span>{formatRelativeTime(conversation.lastMessageAt, locale)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
