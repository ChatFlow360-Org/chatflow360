import { Card, CardContent } from "@/components/ui/card";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
}

export function StatCard({ title, value, icon: Icon, trend }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden border-border bg-card">
      <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-l-lg bg-cta" />
      <CardContent className="flex items-center gap-4 p-5 pl-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cta/10">
          <Icon className="h-5 w-5 text-cta" />
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
