"use client";

import { useState, useMemo, useRef, useCallback, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/i18n/navigation";
import { createPortal } from "react-dom";
import { subDays, startOfDay } from "date-fns";
import { RefreshCw } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { ConversationCard } from "@/components/chat/conversation-card";
import { ConversationFilters } from "@/components/chat/conversation-filters";
import { ConversationDetail } from "@/components/chat/conversation-detail";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/types";

const defaultRange: DateRange = {
  from: startOfDay(subDays(new Date(), 30)),
  to: startOfDay(new Date()),
};

type FilterTab = "all" | "active" | "ai" | "human";

interface ConversationsClientProps {
  conversations: Conversation[];
}

export function ConversationsClient({ conversations }: ConversationsClientProps) {
  const t = useTranslations("conversations");
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);

  const handleRefresh = useCallback(() => {
    startRefresh(() => {
      router.refresh();
    });
  }, [router]);

  const filteredConversations = useMemo(() => {
    let result = conversations;

    if (activeFilter === "active") {
      result = result.filter((c) => c.status === "open" || c.status === "pending");
    } else if (activeFilter === "ai") {
      result = result.filter((c) => c.responderMode === "ai");
    } else if (activeFilter === "human") {
      result = result.filter((c) => c.responderMode === "human");
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.visitorName.toLowerCase().includes(query) ||
          c.lastMessage.toLowerCase().includes(query)
      );
    }

    return result;
  }, [conversations, activeFilter, searchQuery]);

  const selectedConversation = conversations.find((c) => c.id === selectedId);

  // Keep last conversation for exit animation
  const lastConversationRef = useRef<Conversation | null>(null);
  if (selectedConversation) {
    lastConversationRef.current = selectedConversation;
  }
  const panelConversation = selectedConversation ?? lastConversationRef.current;
  const isPanelOpen = !!selectedConversation;

  const closePanel = useCallback(() => setSelectedId(null), []);

  // Portal needs to wait for client mount to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPanelOpen) closePanel();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isPanelOpen, closePanel]);

  return (
    <>
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
          />
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            title={t("refresh")}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Grid — always fluid, never changes when panel opens */}
      <div className="space-y-4">
        <ConversationFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {filteredConversations.map((conv) => (
            <ConversationCard
              key={conv.id}
              conversation={conv}
              isSelected={conv.id === selectedId}
              onClick={() => setSelectedId(conv.id)}
            />
          ))}
        </div>

        {filteredConversations.length === 0 && (
          <div className="flex h-40 items-center justify-center">
            <p className="text-sm text-muted-foreground">{t("noConversations")}</p>
          </div>
        )}
      </div>

      {/* Portal: render backdrop + panel directly in body to avoid overflow clipping */}
      {mounted &&
        createPortal(
          <>
            {/* Backdrop */}
            <div
              className={cn(
                "fixed inset-0 z-50 cursor-pointer bg-black/60 backdrop-blur-md transition-all duration-300",
                isPanelOpen ? "opacity-100" : "pointer-events-none opacity-0 backdrop-blur-none"
              )}
              onClick={closePanel}
            />

            {/* Detail Panel — full-height overlay, slides in from right */}
            <div
              className={cn(
                "fixed inset-y-0 right-0 z-50 w-full shadow-2xl sm:w-[480px] lg:w-[820px]",
                "transition-transform duration-300 ease-out",
                isPanelOpen ? "translate-x-0" : "translate-x-full"
              )}
            >
              {panelConversation && (
                <ConversationDetail
                  conversation={panelConversation}
                  onClose={closePanel}
                />
              )}
            </div>
          </>,
          document.body
        )}
    </>
  );
}
