"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Loader2, Palette } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { upsertWidgetAppearance } from "@/lib/admin/actions";
import {
  DEFAULT_WIDGET_APPEARANCE,
  type WidgetAppearance,
} from "@/lib/widget/appearance";

// ─── Types ────────────────────────────────────────────────────────

interface AppearanceFormProps {
  channelId: string;
  initialAppearance: WidgetAppearance;
}

// ─── Color Picker Row ─────────────────────────────────────────────

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <Label className="text-sm text-muted-foreground shrink-0">{label}</Label>
      <div className="flex items-center gap-2">
        <label className="relative cursor-pointer">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="h-8 w-8 rounded-lg border border-border shadow-sm"
            style={{ backgroundColor: value }}
          />
        </label>
        <Input
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) onChange(v);
          }}
          className="w-[90px] font-mono text-xs h-8 uppercase"
          maxLength={7}
        />
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────

export function AppearanceForm({
  channelId,
  initialAppearance,
}: AppearanceFormProps) {
  const t = useTranslations("settings.widgetAppearance");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [resetId, setResetId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // Form state
  const [appearance, setAppearance] = useState<Required<WidgetAppearance>>(
    () => ({
      ...DEFAULT_WIDGET_APPEARANCE,
      ...initialAppearance,
    })
  );

  function update<K extends keyof WidgetAppearance>(
    key: K,
    value: WidgetAppearance[K]
  ) {
    setAppearance((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertWidgetAppearance(channelId, appearance);
      if (result?.success) {
        setFeedback({ type: "success", msg: t("saved") });
      } else {
        setFeedback({ type: "error", msg: t("saveError") });
      }
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  function handleReset() {
    setAppearance({ ...DEFAULT_WIDGET_APPEARANCE });
    setResetId(null);
  }

  return (
    <div className="space-y-6">
      {/* Feedback */}
      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "border-destructive/20 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Texts Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("sectionTexts")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="headerTitle">{t("headerTitle")}</Label>
            <Input
              id="headerTitle"
              value={appearance.headerTitle}
              onChange={(e) => update("headerTitle", e.target.value)}
              placeholder={t("headerTitlePlaceholder")}
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">
              {t("headerTitleHint")}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="headerSubtitle">{t("headerSubtitle")}</Label>
            <Input
              id="headerSubtitle"
              value={appearance.headerSubtitle}
              onChange={(e) => update("headerSubtitle", e.target.value)}
              placeholder={t("headerSubtitlePlaceholder")}
              maxLength={60}
            />
            <p className="text-xs text-muted-foreground">
              {t("headerSubtitleHint", {
                count: appearance.headerSubtitle.length,
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Header Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("sectionHeader")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ColorRow
            label={t("headerColor")}
            value={appearance.headerColor}
            onChange={(v) => update("headerColor", v)}
          />
          <Separator />
          <ColorRow
            label={t("headerIconColor")}
            value={appearance.headerIconColor}
            onChange={(v) => update("headerIconColor", v)}
          />
        </CardContent>
      </Card>

      {/* Floating Button Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sectionFloatingButton")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ColorRow
            label={t("bubbleColor")}
            value={appearance.bubbleColor}
            onChange={(v) => update("bubbleColor", v)}
          />
          <Separator />
          <ColorRow
            label={t("bubbleIconColor")}
            value={appearance.bubbleIconColor}
            onChange={(v) => update("bubbleIconColor", v)}
          />
        </CardContent>
      </Card>

      {/* Visitor Messages Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sectionVisitorBubble")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ColorRow
            label={t("visitorBubbleBg")}
            value={appearance.visitorBubbleBg}
            onChange={(v) => update("visitorBubbleBg", v)}
          />
          <Separator />
          <ColorRow
            label={t("visitorBubbleText")}
            value={appearance.visitorBubbleText}
            onChange={(v) => update("visitorBubbleText", v)}
          />
        </CardContent>
      </Card>

      {/* AI/Agent Messages Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("sectionAiBubble")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ColorRow
            label={t("aiBubbleBg")}
            value={appearance.aiBubbleBg}
            onChange={(v) => update("aiBubbleBg", v)}
          />
          <Separator />
          <ColorRow
            label={t("aiBubbleText")}
            value={appearance.aiBubbleText}
            onChange={(v) => update("aiBubbleText", v)}
          />
        </CardContent>
      </Card>

      {/* Send Button Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            {t("sectionSendButton")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ColorRow
            label={t("sendButtonColor")}
            value={appearance.sendButtonColor}
            onChange={(v) => update("sendButtonColor", v)}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setResetId("reset")}
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          {t("resetDefaults")}
        </Button>
        <Button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="bg-cta hover:bg-cta/90 text-white"
        >
          {isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
          {tCommon("save")}
        </Button>
      </div>

      {/* Reset Confirm Dialog */}
      <ConfirmDialog
        open={!!resetId}
        onCancel={() => setResetId(null)}
        title={t("resetConfirmTitle")}
        description={t("resetConfirmDescription")}
        onConfirm={handleReset}
      />
    </div>
  );
}
