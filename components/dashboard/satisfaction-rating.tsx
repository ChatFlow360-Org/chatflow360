"use client";

import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SatisfactionRatingProps {
  distribution: {
    average: number;
    total: number;
    counts: Record<number, number>;
  };
}

export function SatisfactionRating({ distribution }: SatisfactionRatingProps) {
  const t = useTranslations("dashboard");

  const stars = [5, 4, 3, 2, 1];
  const maxCount = Math.max(...Object.values(distribution.counts), 1);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold">{t("satisfactionRating")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        {distribution.total === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noRatingsYet")}</p>
        ) : (
          <>
            {/* Average score */}
            <div className="mb-4 flex items-center gap-3">
              <span className="text-3xl font-bold text-foreground">{distribution.average}</span>
              <div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i < Math.round(distribution.average) ? "fill-amber-500 text-amber-500" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {t("totalRatings", { count: distribution.total })}
                </p>
              </div>
            </div>

            {/* Per-star bars */}
            <div className="space-y-2">
              {stars.map((star) => {
                const count = distribution.counts[star] || 0;
                const percent = distribution.total > 0 ? Math.round((count / distribution.total) * 100) : 0;

                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="flex w-8 items-center gap-0.5 text-muted-foreground">
                      {star} <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                    </span>
                    <div className="h-1.5 flex-1 rounded-full bg-muted/30">
                      <div
                        className="h-1.5 rounded-full bg-amber-400 transition-all"
                        style={{ width: `${maxCount > 0 ? (count / maxCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-12 text-right text-muted-foreground">
                      {count} <span className="text-[10px]">({percent}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
