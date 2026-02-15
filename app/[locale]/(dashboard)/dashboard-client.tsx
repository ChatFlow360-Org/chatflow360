"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { subDays, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentConversations } from "@/components/dashboard/recent-conversations";
import { TopPages } from "@/components/dashboard/channels-performance";
import { AiPerformance } from "@/components/dashboard/ai-performance";

const defaultRange: DateRange = {
  from: startOfDay(subDays(new Date(), 30)),
  to: startOfDay(new Date()),
};

export function DashboardClient() {
  const t = useTranslations("dashboard");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);

  return (
    <div className="space-y-6">
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
      <StatsGrid />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <RecentConversations />
        <div className="space-y-6">
          <TopPages />
          <AiPerformance />
        </div>
      </div>
    </div>
  );
}
