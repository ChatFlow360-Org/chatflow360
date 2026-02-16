"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createPortal } from "react-dom";
import { subDays, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { ConversationCard } from "@/components/chat/conversation-card";
import { ConversationFilters } from "@/components/chat/conversation-filters";
import { ConversationDetail } from "@/components/chat/conversation-detail";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { cn } from "@/lib/utils";
import { mockConversations } from "@/lib/mock/data";
import type { Conversation } from "@/types";

const defaultRange: DateRange = {
  from: startOfDay(subDays(new Date(), 30)),
  to: startOfDay(new Date()),
};

type FilterTab = "all" | "active" | "ai" | "human";

export function ConversationsClient() {
  const t = useTranslations("conversations");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);

  const filteredConversations = useMemo(() => {
    let result = mockConversations;

    if (activeFilter === "active") {
      result = result.filter((c) => c.status === "active" || c.status === "waiting");
    } else if (activeFilter === "ai") {
      result = result.filter((c) => c.handledBy === "ai");
    } else if (activeFilter === "human") {
      result = result.filter((c) => c.handledBy === "agent");
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
  }, [activeFilter, searchQuery]);

  const selectedConversation: Conversation | undefined = mockConversations.find(
    (c) => c.id === selectedId
  );

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
        <DateRangePicker
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          className="self-end sm:self-auto"
        />
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
