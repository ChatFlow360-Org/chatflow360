"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Info, X, Send, Bot, User, MessageSquare, Clock, Globe, Calendar, RefreshCw } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
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
import { useRealtimeMessages } from "@/hooks/use-realtime-messages";
import { getConversationMessages } from "@/lib/admin/actions";
import { formatRelativeTime } from "@/lib/utils/format";
import type { Conversation, ConversationStatus, ResponderMode, Message } from "@/types";

interface ConversationDetailProps {
  conversation: Conversation;
  onClose: () => void;
}

export function ConversationDetail({ conversation, onClose }: ConversationDetailProps) {
  const t = useTranslations("conversations");
  const locale = useLocale();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of chat
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, []);

  // Fetch messages (used on mount and for refresh)
  const fetchMessages = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const msgs = await getConversationMessages(conversation.id);
      setMessages(msgs);
      scrollToBottom();
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [conversation.id, scrollToBottom]);

  // Initial fetch when conversation changes
  useEffect(() => {
    setLoading(true);
    fetchMessages();
  }, [fetchMessages]);

  // Realtime: auto-refresh when new messages arrive
  useRealtimeMessages({
    conversationId: conversation.id,
    onNewMessage: () => fetchMessages(false),
    enabled: conversation.status !== "closed",
  });

  const statusConfig: Record<ConversationStatus, { label: string; className: string }> = {
    open: { label: t("status.open"), className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
    pending: { label: t("status.pending"), className: "bg-amber-500/10 text-amber-500 border-amber-500/20" },
    resolved: { label: t("status.resolved"), className: "bg-sky-500/10 text-sky-500 border-sky-500/20" },
    closed: { label: t("status.closed"), className: "bg-destructive/10 text-destructive border-destructive/20" },
  };

  const handlerConfig: Record<ResponderMode, { label: string; icon: typeof Bot }> = {
    ai: { label: t("handler.ai"), icon: Bot },
    human: { label: t("handler.human"), icon: User },
  };

  const status = statusConfig[conversation.status];
  const handler = handlerConfig[conversation.responderMode];
  const HandlerIcon = handler.icon;
  const initials = conversation.visitorName.split(" ").map((n) => n[0]).join("");

  /* -- Lead details content -- reused in desktop sidebar & mobile drawer -- */
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
            {conversation.channelName || conversation.channelId}
          </span>
        </div>
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="space-y-2">
        {conversation.status !== "closed" && conversation.status !== "resolved" ? (
          <Button variant="outline" size="sm" className="w-full text-xs">
            {t("detail.closeConversation")}
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full text-xs">
            {t("detail.reopenConversation")}
          </Button>
        )}
        {conversation.responderMode === "ai" && conversation.status !== "closed" && (
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
            {/* Info button -- mobile/tablet only -> opens lead details drawer */}
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
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => fetchMessages(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="min-h-0 flex-1 p-4">
          <div className="space-y-4">
            {loading ? (
              <div className="flex h-32 items-center justify-center">
                <p className="text-sm text-muted-foreground">...</p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))
            )}
            <div ref={messagesEndRef} />
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

      {/* Lead Details Column -- desktop only */}
      <div className="hidden lg:flex w-[320px] shrink-0 flex-col border-l border-border">
        <ScrollArea className="min-h-0 flex-1">
          <div className="p-5 space-y-5">
            {leadDetailsContent}
          </div>
        </ScrollArea>
      </div>

      {/* Lead Details Drawer -- mobile/tablet only */}
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
