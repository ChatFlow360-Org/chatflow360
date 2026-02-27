"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  RotateCcw,
  Loader2,
  Eye,
  Upload,
  Info,
  Star,
  Mail,
  ImageIcon,
} from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { upsertPostChatSettings } from "@/lib/admin/actions";
import {
  DEFAULT_POST_CHAT,
  TEMPLATE_VARIABLES,
  type PostChatSettings,
} from "@/lib/widget/post-chat";
import { EmailPreview } from "@/components/widget/email-preview";

// ─── Types ────────────────────────────────────────────────────────

interface PostChatFormProps {
  channelId: string;
  orgName: string;
  initialSettings: PostChatSettings;
}

// ─── Component ────────────────────────────────────────────────────

export function PostChatForm({
  channelId,
  orgName,
  initialSettings,
}: PostChatFormProps) {
  const t = useTranslations("settings.postChat");
  const tCommon = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [resetId, setResetId] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  // Form state
  const [settings, setSettings] = useState<Required<PostChatSettings>>(() => ({
    ...DEFAULT_POST_CHAT,
    ...initialSettings,
  }));

  function update<K extends keyof PostChatSettings>(
    key: K,
    value: PostChatSettings[K]
  ) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertPostChatSettings(channelId, settings);
      if (result?.success) {
        setFeedback({ type: "success", msg: t("saved") });
      } else {
        setFeedback({ type: "error", msg: t("saveError") });
      }
      document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => setFeedback(null), 3000);
    });
  }

  function handleReset() {
    setSettings({ ...DEFAULT_POST_CHAT });
    setResetId(null);
  }

  // ─── Form Content ──────────────────────────────────────────────

  const formContent = (
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

      {/* Toggles Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("sectionFeatures")}</CardTitle>
          <CardDescription className="text-xs">
            {t("sectionFeaturesHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Transcript */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                {t("enableTranscript")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("enableTranscriptHint")}
              </p>
            </div>
            <Switch
              checked={settings.enableTranscript}
              onCheckedChange={(v) => update("enableTranscript", v)}
            />
          </div>

          <Separator />

          {/* Enable Rating */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Star className="h-4 w-4 text-muted-foreground" />
                {t("enableRating")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("enableRatingHint")}
              </p>
            </div>
            <Switch
              checked={settings.enableRating}
              onCheckedChange={(v) => update("enableRating", v)}
            />
          </div>

          <Separator />

          {/* CC Email */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("ccEmail")}</Label>
            <Input
              type="email"
              value={settings.ccEmail}
              onChange={(e) => update("ccEmail", e.target.value)}
              placeholder={t("ccEmailPlaceholder")}
            />
            <p className="text-xs text-muted-foreground">{t("ccEmailHint")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            {t("sectionLogo")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("sectionLogoHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {settings.logoUrl ? (
            <div className="space-y-3">
              <div className="relative rounded-lg border border-border bg-muted/30 p-4 flex items-center justify-center">
                <img
                  src={settings.logoUrl}
                  alt="Logo preview"
                  className="max-h-16 object-contain"
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => update("logoUrl", "")}
                className="w-full"
              >
                {t("removeLogo")}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-lg border-2 border-dashed border-border/60 bg-muted/20 p-6 text-center">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  {t("logoDropzone")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {t("logoDimensions")}
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("logoUrlLabel")}
                </Label>
                <Input
                  value={settings.logoUrl}
                  onChange={(e) => update("logoUrl", e.target.value)}
                  placeholder={t("logoUrlPlaceholder")}
                  className="text-xs"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Template Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">{t("sectionTemplate")}</CardTitle>
          <CardDescription className="text-xs">
            {t("sectionTemplateHint")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Variables hint */}
          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
            <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              <span className="font-medium">{t("variablesHint")}</span>{" "}
              {TEMPLATE_VARIABLES.map((v, i) => (
                <span key={v}>
                  <code className="rounded bg-muted px-1 py-0.5 text-[11px] font-mono">
                    {v}
                  </code>
                  {i < TEMPLATE_VARIABLES.length - 1 && ", "}
                </span>
              ))}
            </div>
          </div>

          {/* Subject — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("emailSubject")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("english")}
                </Label>
                <Input
                  value={settings.emailSubjectEn}
                  onChange={(e) => update("emailSubjectEn", e.target.value)}
                  placeholder={t("emailSubjectPlaceholderEn")}
                  maxLength={100}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("spanish")}
                </Label>
                <Input
                  value={settings.emailSubjectEs}
                  onChange={(e) => update("emailSubjectEs", e.target.value)}
                  placeholder={t("emailSubjectPlaceholderEs")}
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Greeting — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("emailGreeting")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("english")}
                </Label>
                <Input
                  value={settings.emailGreetingEn}
                  onChange={(e) => update("emailGreetingEn", e.target.value)}
                  placeholder={t("emailGreetingPlaceholderEn")}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("spanish")}
                </Label>
                <Input
                  value={settings.emailGreetingEs}
                  onChange={(e) => update("emailGreetingEs", e.target.value)}
                  placeholder={t("emailGreetingPlaceholderEs")}
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Closing — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("emailClosing")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("english")}
                </Label>
                <Input
                  value={settings.emailClosingEn}
                  onChange={(e) => update("emailClosingEn", e.target.value)}
                  placeholder={t("emailClosingPlaceholderEn")}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("spanish")}
                </Label>
                <Input
                  value={settings.emailClosingEs}
                  onChange={(e) => update("emailClosingEs", e.target.value)}
                  placeholder={t("emailClosingPlaceholderEs")}
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Header Color */}
          <div className="flex items-center justify-between gap-4">
            <Label className="text-sm font-medium">
              {t("emailHeaderColor")}
            </Label>
            <div className="flex items-center gap-2">
              <label className="relative cursor-pointer">
                <input
                  type="color"
                  value={settings.emailHeaderColor}
                  onChange={(e) => update("emailHeaderColor", e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div
                  className="h-8 w-8 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: settings.emailHeaderColor }}
                />
              </label>
              <Input
                value={settings.emailHeaderColor}
                onChange={(e) => {
                  const v = e.target.value;
                  if (/^#[0-9A-Fa-f]{0,6}$/.test(v))
                    update("emailHeaderColor", v);
                }}
                className="w-[90px] font-mono text-xs h-8 uppercase"
                maxLength={7}
              />
            </div>
          </div>

          <Separator />

          {/* Footer — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("emailFooter")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("english")}
                </Label>
                <Input
                  value={settings.emailFooterTextEn}
                  onChange={(e) => update("emailFooterTextEn", e.target.value)}
                  placeholder={t("emailFooterPlaceholderEn")}
                  maxLength={200}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {t("spanish")}
                </Label>
                <Input
                  value={settings.emailFooterTextEs}
                  onChange={(e) => update("emailFooterTextEs", e.target.value)}
                  placeholder={t("emailFooterPlaceholderEs")}
                  maxLength={200}
                />
              </div>
            </div>
          </div>
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

  // ─── Layout: 60/40 split on lg+, stacked on mobile ───────────

  return (
    <>
      <div className="flex gap-6">
        {/* Form Column */}
        <div className="flex-1 min-w-0">{formContent}</div>

        {/* Preview Column — desktop only (lg+) */}
        <div className="hidden lg:block w-[380px] shrink-0">
          <div className="sticky top-24">
            <EmailPreview settings={settings} orgName={orgName} />
          </div>
        </div>
      </div>

      {/* Mobile Preview FAB — visible below lg */}
      <button
        type="button"
        onClick={() => setMobilePreview(true)}
        className="fixed bottom-6 right-6 z-40 lg:hidden flex items-center gap-2 rounded-full bg-cta text-white px-4 py-3 shadow-lg hover:bg-cta/90 transition-colors"
      >
        <Eye className="h-4 w-4" />
        <span className="text-sm font-medium">{t("emailPreview")}</span>
      </button>

      {/* Mobile Preview Drawer */}
      <Drawer open={mobilePreview} onOpenChange={setMobilePreview}>
        <DrawerContent>
          <DrawerHeader className="text-left">
            <DrawerTitle>{t("emailPreview")}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto max-h-[80vh]">
            <EmailPreview settings={settings} orgName={orgName} />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
