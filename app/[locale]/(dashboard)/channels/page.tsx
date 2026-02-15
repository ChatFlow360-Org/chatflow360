import { useTranslations } from "next-intl";
import { Radio } from "lucide-react";

export default function ChannelsPage() {
  const t = useTranslations("channels");
  const tc = useTranslations("common");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cta/10">
          <Radio className="h-6 w-6 text-cta" />
        </div>
        <p className="font-medium text-foreground">{tc("comingSoon")}</p>
        <p className="text-sm text-muted-foreground">{t("comingSoonDescription")}</p>
      </div>
    </div>
  );
}
