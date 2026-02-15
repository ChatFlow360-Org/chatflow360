import { useTranslations } from "next-intl";
import { SettingsAiClient } from "./settings-ai-client";

export default function SettingsAiPage() {
  const t = useTranslations("settings");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <SettingsAiClient />
    </div>
  );
}
