"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "active" | "ai" | "human";

interface ConversationFiltersProps {
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ConversationFilters({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: ConversationFiltersProps) {
  const t = useTranslations("conversations.filters");

  const tabs: { value: FilterTab; label: string }[] = [
    { value: "all", label: t("all") },
    { value: "active", label: t("active") },
    { value: "ai", label: t("ai") },
    { value: "human", label: t("human") },
  ];
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1 rounded-lg border border-border/50 bg-muted p-1">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeFilter === tab.value
                ? "bg-card text-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          maxLength={100}
          className="h-9 pl-9 text-sm dark:border-muted-foreground/20 dark:bg-muted/30"
        />
      </div>
    </div>
  );
}
