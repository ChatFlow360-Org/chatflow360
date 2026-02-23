"use client";

import { useState, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import { subDays, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { RecentConversations } from "@/components/dashboard/recent-conversations";
import { TopPages } from "@/components/dashboard/channels-performance";
import { AiPerformance } from "@/components/dashboard/ai-performance";
import { fetchDashboardData, type DashboardData } from "@/lib/dashboard/stats";

const defaultRange: DateRange = {
  from: startOfDay(subDays(new Date(), 30)),
  to: startOfDay(new Date()),
};

interface DashboardClientProps {
  initialData: DashboardData;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const t = useTranslations("dashboard");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(defaultRange);
  const [data, setData] = useState<DashboardData>(initialData);
  const [isPending, startTransition] = useTransition();

  const handleDateRangeChange = useCallback(
    (range: DateRange | undefined) => {
      setDateRange(range);
      if (range?.from) {
        startTransition(async () => {
          const result = await fetchDashboardData({
            from: range.from!.toISOString(),
            to: range.to?.toISOString() ?? range.from!.toISOString(),
          });
          if (result) setData(result);
        });
      }
    },
    []
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          {isPending && (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-cta border-t-transparent" />
          )}
          <DateRangePicker
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>
      <StatsGrid stats={data.stats} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <RecentConversations conversations={data.recentConversations} />
        <div className="space-y-6">
          <TopPages pages={data.topPages} />
          <AiPerformance performance={data.aiPerformance} />
        </div>
      </div>
    </div>
  );
}
