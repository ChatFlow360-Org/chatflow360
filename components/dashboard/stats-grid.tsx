"use client";

import { useTranslations } from "next-intl";
import { MessageSquare, Users, Clock, Bot, UserPlus } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { formatNumber } from "@/lib/utils/format";

interface StatsGridProps {
  stats: {
    totalConversations: number;
    activeNow: number;
    avgResponseTimeSec: number;
    aiHandledPercent: number;
    newVisitors: number;
  };
}

function formatAvgTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function StatsGrid({ stats }: StatsGridProps) {
  const t = useTranslations("dashboard");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        title={t("activeNow")}
        value={stats.activeNow.toString()}
        icon={Users}
        accent="emerald"
      />
      <StatCard
        title={t("totalConversations")}
        value={formatNumber(stats.totalConversations)}
        icon={MessageSquare}
      />
      <StatCard
        title={t("avgResponseTime")}
        value={formatAvgTime(stats.avgResponseTimeSec)}
        icon={Clock}
      />
      <StatCard
        title={t("aiHandled")}
        value={`${stats.aiHandledPercent}%`}
        icon={Bot}
      />
      <StatCard
        title={t("newVisitors")}
        value={formatNumber(stats.newVisitors)}
        icon={UserPlus}
      />
    </div>
  );
}
