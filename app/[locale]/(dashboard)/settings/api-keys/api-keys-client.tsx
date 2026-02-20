"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Key, ShieldCheck } from "lucide-react";
import { upsertPlatformKey } from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ApiKeysClientProps {
  globalKeyHint: string | null;
}

export function ApiKeysClient({ globalKeyHint }: ApiKeysClientProps) {
  const t = useTranslations("apiKeys");
  const tErrors = useTranslations("admin.errors");
  const [state, formAction, isPending] = useActionState(upsertPlatformKey, null);

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Success / Error Feedback */}
      {state?.success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          {t("saved")}
        </div>
      )}
      {state?.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {tErrors(state.error)}
        </div>
      )}

      {/* OpenAI API Key Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t("openaiKey.title")}</CardTitle>
          </div>
          <CardDescription>{t("openaiKey.description")}</CardDescription>
        </CardHeader>

        <form action={formAction}>
          <input type="hidden" name="key" value="openai_api_key" />

          <CardContent className="space-y-4">
            {/* Current Key Status */}
            {globalKeyHint && (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/50 px-4 py-3">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-mono text-sm text-muted-foreground">
                  {t("openaiKey.currentKey")}: {globalKeyHint}
                </span>
                <Badge
                  variant="secondary"
                  className="ml-auto bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  {t("openaiKey.configured")}
                </Badge>
              </div>
            )}

            {!globalKeyHint && (
              <div className="flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
                <Key className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  {t("openaiKey.notConfigured")}
                </span>
              </div>
            )}

            {/* API Key Input */}
            <div className="space-y-2">
              <Input
                type="password"
                name="value"
                placeholder={t("openaiKey.placeholder")}
                maxLength={200}
                required
                className="bg-background font-mono"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                {t("openaiKey.helpText")}
              </p>
            </div>
          </CardContent>

          <CardFooter className="pt-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? t("saving") : t("saveKey")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
