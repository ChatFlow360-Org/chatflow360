import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

type AccentColor = "cta" | "emerald";

const accentStyles: Record<AccentColor, { border: string; bg: string; text: string; card: string }> = {
  cta: { border: "border-l-cta", bg: "bg-cta/10", text: "text-cta", card: "bg-card" },
  emerald: { border: "border-l-emerald-500", bg: "bg-emerald-500/10", text: "text-emerald-500", card: "bg-emerald-500/5" },
};

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  accent?: AccentColor;
}

export function StatCard({ title, value, icon: Icon, trend, accent = "cta" }: StatCardProps) {
  const s = accentStyles[accent];

  return (
    <Card className={`border-border border-l-[3px] ${s.border} ${s.card}`}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${s.bg}`}>
          <Icon className={`h-5 w-5 ${s.text}`} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {trend && (
              <span className="text-xs font-medium text-emerald-500">{trend}</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
