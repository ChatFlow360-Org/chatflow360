"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AiPerformanceProps {
  performance: {
    aiHandled: number;
    humanEscalated: number;
    totalConversations: number;
  };
}

export function AiPerformance({ performance }: AiPerformanceProps) {
  const t = useTranslations("dashboard");

  const total = performance.totalConversations || 1;
  const aiPercent = Math.round((performance.aiHandled / total) * 100);
  const humanPercent = 100 - aiPercent;

  const metrics = [
    { label: t("handledByAi"), value: `${aiPercent}%`, percent: aiPercent, color: "bg-emerald-400", textColor: "text-emerald-400" },
    { label: t("escalatedToHuman"), value: `${humanPercent}%`, percent: humanPercent, color: "bg-amber-400", textColor: "text-amber-400" },
  ];

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold">{t("aiPerformance")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {metrics.map((m) => (
          <div key={m.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{m.label}</span>
              <span className={`text-[13px] font-semibold ${m.textColor}`}>{m.value}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/30">
              <div
                className={`h-1.5 rounded-full ${m.color}`}
                style={{ width: `${m.percent}%` }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
