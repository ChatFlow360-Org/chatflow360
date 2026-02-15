"use client";

import { useState } from "react";
import { Info, X, Send, Bot, User, MessageSquare, Clock, Globe, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { ChatMessage } from "@/components/chat/chat-message";
import { mockMessages } from "@/lib/mock/data";
import { formatRelativeTime } from "@/lib/utils/format";
import type { Conversation, ConversationStatus, MessageSender } from "@/types";

interface ConversationDetailProps {
  conversation: Conversation;
  onClose: () => void;
}

export function ConversationDetail({ conversation, onClose }: ConversationDetailProps) {
  const t = useTranslations("conversations");
  const locale = useLocale();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const statusConfig: Record<ConversationStatus, { label: string; className: string }> = {
    active: { label: t("status.active"), className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    waiting: { label: t("status.waiting"), className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    closed: { label: t("status.closed"), className: "bg-muted-foreground/10 text-muted-foreground border-muted-foreground/20" },
  };

  const handlerConfig: Record<MessageSender, { label: string; icon: typeof Bot }> = {
    ai: { label: t("handler.ai"), icon: Bot },
    agent: { label: t("handler.human"), icon: User },
    visitor: { label: t("handler.visitor"), icon: User },
  };

  const messages = mockMessages[conversation.id] || [];
  const status = statusConfig[conversation.status];
  const handler = handlerConfig[conversation.handledBy];
  const HandlerIcon = handler.icon;
  const initials = conversation.visitorName.split(" ").map((n) => n[0]).join("");

  const channelNames: Record<string, string> = {
    "ch-1": "Main Website",
    "ch-2": "Landing Page",
    "ch-3": "Support Portal",
  };

  /* ── Lead details content — reused in desktop sidebar & mobile drawer ── */
  const leadDetailsContent = (
    <>
      {/* Lead Profile */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-brand-light/10">
          <span className="text-lg font-semibold text-primary-brand-light">
            {initials}
          </span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{conversation.visitorName}</p>
          {conversation.visitorEmail && (
            <p className="text-xs text-muted-foreground">{conversation.visitorEmail}</p>
          )}
        </div>
        <Badge variant="outline" className={status.className}>
          {status.label}
        </Badge>
      </div>

      <Separator />

      {/* Conversation Info */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("detail.conversationInfo")}
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 text-sm pt-1">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <HandlerIcon className="h-3.5 w-3.5" />
            {t("detail.handler")}
          </span>
          <span className="text-foreground font-medium">{handler.label}</span>

          <span className="flex items-center gap-1.5 text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            {t("detail.messages")}
          </span>
          <span className="text-foreground font-medium">{conversation.messageCount}</span>

          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="h-3.5 w-3.5" />
            {t("detail.started")}
          </span>
          <span className="text-foreground font-medium">
            {new Date(conversation.createdAt).toLocaleDateString(locale, {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {t("detail.lastActivity")}
          </span>
          <span className="text-foreground font-medium">
            {formatRelativeTime(conversation.lastMessageAt, locale)}
          </span>
        </div>
      </div>

      <Separator />

      {/* Channel Info */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("detail.channelInfo")}
        </p>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2.5 text-sm pt-1">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            {t("detail.channel")}
          </span>
          <span className="text-foreground font-medium">
            {channelNames[conversation.channelId] || conversation.channelId}
          </span>
        </div>
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="space-y-2">
        {conversation.status !== "closed" ? (
          <Button variant="outline" size="sm" className="w-full text-xs">
            {t("detail.closeConversation")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full text-xs">
            {t("detail.reopenConversation")}
          </Button>
        )}
        {conversation.handledBy === "ai" && conversation.status !== "closed" && (
          <Button variant="outline" size="sm" className="w-full text-xs">
            {t("detail.assignToAgent")}
          </Button>
        )}
      </div>
    </>
  );

  return (
    <div className="flex h-screen flex-col lg:flex-row border-l border-border bg-card overflow-hidden">
      {/* Chat Column */}
      <div className="flex flex-1 min-w-0 min-h-0 flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Info button — mobile/tablet only → opens lead details drawer */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 lg:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              <Info className="h-4 w-4" />
            </Button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-brand-light/10">
              <span className="text-xs font-semibold text-primary-brand-light">
                {initials}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{conversation.visitorName}</p>
              {conversation.visitorEmail && (
                <p className="text-xs text-muted-foreground">{conversation.visitorEmail}</p>
              )}
            </div>
            <Badge variant="outline" className={status.className}>
              {status.label}
            </Badge>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="min-h-0 flex-1 p-4">
          <div className="space-y-4">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* Input */}
        <div className="flex items-center gap-2 p-3">
          <Input
            placeholder={t("typeMessage")}
            className="flex-1 text-sm"
          />
          <Button size="icon" className="h-9 w-9 bg-cta text-cta-foreground hover:bg-cta/90">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Lead Details Column — desktop only */}
      <div className="hidden lg:flex w-[320px] shrink-0 flex-col border-l border-border">
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-5 space-y-5">
            {leadDetailsContent}
          </div>
        </ScrollArea>
      </div>

      {/* Lead Details Drawer — mobile/tablet only */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
          <DrawerHeader className="text-center">
            <DrawerTitle>{t("detail.leadInfo")}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {conversation.visitorName}
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto max-h-[60vh] px-5 pb-5 space-y-5">
            {leadDetailsContent}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
