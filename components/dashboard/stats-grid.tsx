"use client";

import { useTranslations } from "next-intl";
import { MessageSquare, Users, Clock, Bot, UserPlus } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { mockStats } from "@/lib/mock/data";
import { formatNumber } from "@/lib/utils/format";

export function StatsGrid() {
  const t = useTranslations("dashboard");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title={t("totalConversations")}
        value={formatNumber(mockStats.totalConversations)}
        icon={MessageSquare}
        trend="+12%"
      />
      <StatCard
        title={t("activeNow")}
        value={mockStats.activeNow.toString()}
        icon={Users}
        trend="+3"
      />
      <StatCard
        title={t("avgSessionTime")}
        value={mockStats.avgSessionTime}
        icon={Clock}
        trend="+0.8m"
      />
      <StatCard
        title={t("aiHandled")}
        value={`${mockStats.aiHandled}%`}
        icon={Bot}
        trend="+4%"
      />
      <StatCard
        title={t("newVisitors")}
        value={formatNumber(mockStats.newVisitors)}
        icon={UserPlus}
        trend="+12%"
      />
    </div>
  );
}
