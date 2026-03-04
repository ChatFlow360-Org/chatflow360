"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { RotateCcw, Loader2, Eye, Check, Languages } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { upsertWidgetAppearance } from "@/lib/admin/actions";
import {
  DEFAULT_WIDGET_APPEARANCE,
  type WidgetAppearance,
} from "@/lib/widget/appearance";
import { WidgetPreview } from "@/components/widget/widget-preview";
import { EmbedCodeCard } from "@/components/widget/embed-code-card";
import { useAutoSave } from "@/lib/hooks/use-auto-save";
import { StarterQuestionsEditor } from "@/components/widget/starter-questions-editor";
import { TranslateButton } from "@/components/ui/translate-button";
import { useBulkTranslate } from "@/lib/hooks/use-bulk-translate";

// ─── Types ────────────────────────────────────────────────────────

interface AppearanceFormProps {
  channelId: string;
  publicKey: string;
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
  publicKey,
  initialAppearance,
}: AppearanceFormProps) {
  const t = useTranslations("settings.widgetAppearance");
  const tCommon = useTranslations("common");
  const [resetId, setResetId] = useState<string | null>(null);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [activeSection, setActiveSection] = useState<"bubble" | "welcome" | "texts" | "colors">("bubble");
  const { translateAll: translateBubble, loading: bulkBubble } = useBulkTranslate();
  const { translateAll: translateWelcome, loading: bulkWelcome } = useBulkTranslate();
  const { translateAll: translateTexts, loading: bulkTexts } = useBulkTranslate();

  // Scroll-spy refs
  const bubbleRef = useRef<HTMLDivElement>(null);
  const welcomeRef = useRef<HTMLDivElement>(null);
  const textsRef = useRef<HTMLDivElement>(null);
  const colorsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const map = new Map<Element, "bubble" | "welcome" | "texts" | "colors">();
    if (bubbleRef.current) map.set(bubbleRef.current, "bubble");
    if (welcomeRef.current) map.set(welcomeRef.current, "welcome");
    if (textsRef.current) map.set(textsRef.current, "texts");
    if (colorsRef.current) map.set(colorsRef.current, "colors");
    if (map.size === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const section = map.get(entry.target);
            if (section) setActiveSection(section);
          }
        }
      },
      // Trigger zone: top 20%-40% of viewport
      { rootMargin: "-20% 0px -60% 0px" },
    );

    map.forEach((_, el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

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

  // Auto-save
  const handleAutoSave = useCallback(
    (data: Required<WidgetAppearance>) => upsertWidgetAppearance(channelId, data),
    [channelId]
  );
  const { saveStatus, hasChanges, saveNow } = useAutoSave({
    data: appearance,
    onSave: handleAutoSave,
    onSaved: () => toast.success(t("saved")),
  });

  function handleReset() {
    setAppearance({ ...DEFAULT_WIDGET_APPEARANCE });
    setResetId(null);
  }

  // ─── Shared Form Content ──────────────────────────────────────

  const formContent = (
    <div className="space-y-6">
      {/* ─── Chat Bubble Section ─────────────────────────────────── */}
      <Card ref={bubbleRef}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{t("sectionBubble")}</CardTitle>
              <CardDescription className="text-xs">
                {t("sectionBubbleHint")}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={bulkBubble}
              onClick={() => {
                const pairs: { sourceText: string; direction: "en-to-es" | "es-to-en"; onTranslated: (t: string) => void }[] = [];
                if (appearance.teaserTextEn && !appearance.teaserTextEs)
                  pairs.push({ sourceText: appearance.teaserTextEn, direction: "en-to-es", onTranslated: (v) => update("teaserTextEs", v) });
                else if (appearance.teaserTextEs && !appearance.teaserTextEn)
                  pairs.push({ sourceText: appearance.teaserTextEs, direction: "es-to-en", onTranslated: (v) => update("teaserTextEn", v) });
                if (appearance.teaserCtaEn && !appearance.teaserCtaEs)
                  pairs.push({ sourceText: appearance.teaserCtaEn, direction: "en-to-es", onTranslated: (v) => update("teaserCtaEs", v) });
                else if (appearance.teaserCtaEs && !appearance.teaserCtaEn)
                  pairs.push({ sourceText: appearance.teaserCtaEs, direction: "es-to-en", onTranslated: (v) => update("teaserCtaEn", v) });
                if (pairs.length > 0) translateBubble(pairs);
              }}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-black border-0 shrink-0"
            >
              {bulkBubble ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Languages className="mr-1 h-3 w-3" />}
              {tCommon("translateEmpty")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Bubble Colors */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ColorRow
              label={t("bubbleColor")}
              value={appearance.bubbleColor}
              onChange={(v) => update("bubbleColor", v)}
            />
            <ColorRow
              label={t("bubbleIconColor")}
              value={appearance.bubbleIconColor}
              onChange={(v) => update("bubbleIconColor", v)}
            />
            <ColorRow
              label={t("teaserBgColor")}
              value={appearance.teaserBgColor}
              onChange={(v) => update("teaserBgColor", v)}
            />
            <ColorRow
              label={t("teaserCtaColor")}
              value={appearance.teaserCtaColor}
              onChange={(v) => update("teaserCtaColor", v)}
            />
          </div>

          <Separator />

          {/* Teaser Text — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("teaserText")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="teaserTextEn" className="text-xs text-muted-foreground">
                    {t("english")}
                  </Label>
                  <TranslateButton sourceText={appearance.teaserTextEs} direction="es-to-en" onTranslated={(v) => update("teaserTextEn", v)} />
                </div>
                <Input
                  id="teaserTextEn"
                  value={appearance.teaserTextEn}
                  onChange={(e) => update("teaserTextEn", e.target.value)}
                  placeholder={t("teaserTextPlaceholderEn")}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="teaserTextEs" className="text-xs text-muted-foreground">
                    {t("spanish")}
                  </Label>
                  <TranslateButton sourceText={appearance.teaserTextEn} direction="en-to-es" onTranslated={(v) => update("teaserTextEs", v)} />
                </div>
                <Input
                  id="teaserTextEs"
                  value={appearance.teaserTextEs}
                  onChange={(e) => update("teaserTextEs", e.target.value)}
                  placeholder={t("teaserTextPlaceholderEs")}
                  maxLength={80}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("teaserTextHint")}
            </p>
          </div>

          <Separator />

          {/* Teaser CTA — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("teaserCta")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="teaserCtaEn" className="text-xs text-muted-foreground">
                    {t("english")}
                  </Label>
                  <TranslateButton sourceText={appearance.teaserCtaEs} direction="es-to-en" onTranslated={(v) => update("teaserCtaEn", v)} />
                </div>
                <Input
                  id="teaserCtaEn"
                  value={appearance.teaserCtaEn}
                  onChange={(e) => update("teaserCtaEn", e.target.value)}
                  placeholder={t("teaserCtaPlaceholderEn")}
                  maxLength={30}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="teaserCtaEs" className="text-xs text-muted-foreground">
                    {t("spanish")}
                  </Label>
                  <TranslateButton sourceText={appearance.teaserCtaEn} direction="en-to-es" onTranslated={(v) => update("teaserCtaEs", v)} />
                </div>
                <Input
                  id="teaserCtaEs"
                  value={appearance.teaserCtaEs}
                  onChange={(e) => update("teaserCtaEs", e.target.value)}
                  placeholder={t("teaserCtaPlaceholderEs")}
                  maxLength={30}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("teaserCtaHint")}
            </p>
          </div>

          <Separator />

          {/* Auto-show Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="teaserAutoShow" className="cursor-pointer text-sm font-medium">
                {t("teaserAutoShow")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("teaserAutoShowHint")}
              </p>
            </div>
            <Switch
              id="teaserAutoShow"
              checked={appearance.teaserAutoShow}
              onCheckedChange={(v) => update("teaserAutoShow", v)}
            />
          </div>

          {/* Delay Seconds — only when auto-show is ON */}
          {appearance.teaserAutoShow && (
            <>
              <Separator />
              <div className="flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <Label htmlFor="teaserDelaySeconds" className="text-sm font-medium">
                    {t("teaserDelay")}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t("teaserDelayHint")}
                  </p>
                </div>
                <Select
                  value={String(appearance.teaserDelaySeconds)}
                  onValueChange={(v) => update("teaserDelaySeconds", parseInt(v, 10))}
                >
                  <SelectTrigger className="w-36 h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
                    {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60].map((s) => (
                      <SelectItem key={s} value={String(s)}>{s} seconds</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Welcome Screen Section ──────────────────────────────── */}
      <Card ref={welcomeRef}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{t("sectionWelcome")}</CardTitle>
              <CardDescription className="text-xs">
                {t("sectionWelcomeHint")}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={bulkWelcome}
              onClick={() => {
                const pairs: { sourceText: string; direction: "en-to-es" | "es-to-en"; onTranslated: (t: string) => void }[] = [];
                if (appearance.welcomeTitleEn && !appearance.welcomeTitleEs)
                  pairs.push({ sourceText: appearance.welcomeTitleEn, direction: "en-to-es", onTranslated: (v) => update("welcomeTitleEs", v) });
                else if (appearance.welcomeTitleEs && !appearance.welcomeTitleEn)
                  pairs.push({ sourceText: appearance.welcomeTitleEs, direction: "es-to-en", onTranslated: (v) => update("welcomeTitleEn", v) });
                if (appearance.welcomeSubtitleEn && !appearance.welcomeSubtitleEs)
                  pairs.push({ sourceText: appearance.welcomeSubtitleEn, direction: "en-to-es", onTranslated: (v) => update("welcomeSubtitleEs", v) });
                else if (appearance.welcomeSubtitleEs && !appearance.welcomeSubtitleEn)
                  pairs.push({ sourceText: appearance.welcomeSubtitleEs, direction: "es-to-en", onTranslated: (v) => update("welcomeSubtitleEn", v) });
                // Include starter questions if enabled
                if (appearance.useStarterQuestions) {
                  appearance.starterQuestions.forEach((q, idx) => {
                    if (q.textEn && !q.textEs)
                      pairs.push({ sourceText: q.textEn, direction: "en-to-es", onTranslated: (v) => {
                        const updated = [...appearance.starterQuestions];
                        updated[idx] = { ...updated[idx], textEs: v };
                        update("starterQuestions", updated);
                      }});
                    else if (q.textEs && !q.textEn)
                      pairs.push({ sourceText: q.textEs, direction: "es-to-en", onTranslated: (v) => {
                        const updated = [...appearance.starterQuestions];
                        updated[idx] = { ...updated[idx], textEn: v };
                        update("starterQuestions", updated);
                      }});
                  });
                }
                if (pairs.length > 0) translateWelcome(pairs);
              }}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-black border-0 shrink-0"
            >
              {bulkWelcome ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Languages className="mr-1 h-3 w-3" />}
              {tCommon("translateEmpty")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Welcome Title — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("welcomeTitle")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="welcomeTitleEn" className="text-xs text-muted-foreground">
                    {t("english")}
                  </Label>
                  <TranslateButton sourceText={appearance.welcomeTitleEs} direction="es-to-en" onTranslated={(v) => update("welcomeTitleEn", v)} />
                </div>
                <Input
                  id="welcomeTitleEn"
                  value={appearance.welcomeTitleEn}
                  onChange={(e) => update("welcomeTitleEn", e.target.value)}
                  placeholder={t("welcomeTitlePlaceholderEn")}
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="welcomeTitleEs" className="text-xs text-muted-foreground">
                    {t("spanish")}
                  </Label>
                  <TranslateButton sourceText={appearance.welcomeTitleEn} direction="en-to-es" onTranslated={(v) => update("welcomeTitleEs", v)} />
                </div>
                <Input
                  id="welcomeTitleEs"
                  value={appearance.welcomeTitleEs}
                  onChange={(e) => update("welcomeTitleEs", e.target.value)}
                  placeholder={t("welcomeTitlePlaceholderEs")}
                  maxLength={60}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("welcomeTitleHint")}
            </p>
          </div>

          <Separator />

          {/* Welcome Subtitle — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("welcomeSubtitle")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="welcomeSubtitleEn" className="text-xs text-muted-foreground">
                    {t("english")}
                  </Label>
                  <TranslateButton sourceText={appearance.welcomeSubtitleEs} direction="es-to-en" onTranslated={(v) => update("welcomeSubtitleEn", v)} />
                </div>
                <Input
                  id="welcomeSubtitleEn"
                  value={appearance.welcomeSubtitleEn}
                  onChange={(e) => update("welcomeSubtitleEn", e.target.value)}
                  placeholder={t("welcomeSubtitlePlaceholderEn")}
                  maxLength={80}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="welcomeSubtitleEs" className="text-xs text-muted-foreground">
                    {t("spanish")}
                  </Label>
                  <TranslateButton sourceText={appearance.welcomeSubtitleEn} direction="en-to-es" onTranslated={(v) => update("welcomeSubtitleEs", v)} />
                </div>
                <Input
                  id="welcomeSubtitleEs"
                  value={appearance.welcomeSubtitleEs}
                  onChange={(e) => update("welcomeSubtitleEs", e.target.value)}
                  placeholder={t("welcomeSubtitlePlaceholderEs")}
                  maxLength={80}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("welcomeSubtitleHint")}
            </p>
          </div>

          <Separator />

          {/* Starter Questions Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <Label htmlFor="useStarterQuestions" className="cursor-pointer text-sm font-medium">
                {t("useStarterQuestions")}
              </Label>
              <p className="text-xs text-muted-foreground">
                {t("useStarterQuestionsHint")}
              </p>
            </div>
            <Switch
              id="useStarterQuestions"
              checked={appearance.useStarterQuestions}
              onCheckedChange={(v) => update("useStarterQuestions", v)}
            />
          </div>

          {/* Starter Questions Editor */}
          {appearance.useStarterQuestions && (
            <>
              <Separator />
              <StarterQuestionsEditor
                questions={appearance.starterQuestions}
                onChange={(qs) => update("starterQuestions", qs)}
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Texts Section — Header EN/ES pairs */}
      <Card ref={textsRef}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">{t("sectionTexts")}</CardTitle>
              <CardDescription className="text-xs">
                {t("sectionTextsHint")}
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={bulkTexts}
              onClick={() => {
                const pairs: { sourceText: string; direction: "en-to-es" | "es-to-en"; onTranslated: (t: string) => void }[] = [];
                if (appearance.headerTitleEn && !appearance.headerTitleEs)
                  pairs.push({ sourceText: appearance.headerTitleEn, direction: "en-to-es", onTranslated: (v) => update("headerTitleEs", v) });
                else if (appearance.headerTitleEs && !appearance.headerTitleEn)
                  pairs.push({ sourceText: appearance.headerTitleEs, direction: "es-to-en", onTranslated: (v) => update("headerTitleEn", v) });
                if (appearance.headerSubtitleEn && !appearance.headerSubtitleEs)
                  pairs.push({ sourceText: appearance.headerSubtitleEn, direction: "en-to-es", onTranslated: (v) => update("headerSubtitleEs", v) });
                else if (appearance.headerSubtitleEs && !appearance.headerSubtitleEn)
                  pairs.push({ sourceText: appearance.headerSubtitleEs, direction: "es-to-en", onTranslated: (v) => update("headerSubtitleEn", v) });
                if (pairs.length > 0) translateTexts(pairs);
              }}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-black border-0 shrink-0"
            >
              {bulkTexts ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Languages className="mr-1 h-3 w-3" />}
              {tCommon("translateEmpty")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Header Title — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("headerTitle")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="headerTitleEn" className="text-xs text-muted-foreground">
                    {t("english")}
                  </Label>
                  <TranslateButton sourceText={appearance.headerTitleEs} direction="es-to-en" onTranslated={(v) => update("headerTitleEn", v)} />
                </div>
                <Input
                  id="headerTitleEn"
                  value={appearance.headerTitleEn}
                  onChange={(e) => update("headerTitleEn", e.target.value)}
                  placeholder={t("headerTitlePlaceholderEn")}
                  maxLength={40}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="headerTitleEs" className="text-xs text-muted-foreground">
                    {t("spanish")}
                  </Label>
                  <TranslateButton sourceText={appearance.headerTitleEn} direction="en-to-es" onTranslated={(v) => update("headerTitleEs", v)} />
                </div>
                <Input
                  id="headerTitleEs"
                  value={appearance.headerTitleEs}
                  onChange={(e) => update("headerTitleEs", e.target.value)}
                  placeholder={t("headerTitlePlaceholderEs")}
                  maxLength={40}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("headerTitleHint")}
            </p>
          </div>

          <Separator />

          {/* Header Subtitle — EN / ES */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t("headerSubtitle")}</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="headerSubtitleEn" className="text-xs text-muted-foreground">
                    {t("english")}
                  </Label>
                  <TranslateButton sourceText={appearance.headerSubtitleEs} direction="es-to-en" onTranslated={(v) => update("headerSubtitleEn", v)} />
                </div>
                <Input
                  id="headerSubtitleEn"
                  value={appearance.headerSubtitleEn}
                  onChange={(e) => update("headerSubtitleEn", e.target.value)}
                  placeholder={t("headerSubtitlePlaceholderEn")}
                  maxLength={60}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="headerSubtitleEs" className="text-xs text-muted-foreground">
                    {t("spanish")}
                  </Label>
                  <TranslateButton sourceText={appearance.headerSubtitleEn} direction="en-to-es" onTranslated={(v) => update("headerSubtitleEs", v)} />
                </div>
                <Input
                  id="headerSubtitleEs"
                  value={appearance.headerSubtitleEs}
                  onChange={(e) => update("headerSubtitleEs", e.target.value)}
                  placeholder={t("headerSubtitlePlaceholderEs")}
                  maxLength={60}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("headerSubtitleHint")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Color Sections — 2-col grid */}
      <div ref={colorsRef} className="grid gap-4 sm:grid-cols-2">
        {/* Header */}
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

        {/* Visitor Messages */}
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

        {/* AI/Agent Messages */}
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

        {/* Send Button — spans full width */}
        <Card className="sm:col-span-2">
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
      </div>

      {/* Embed Code */}
      {publicKey && <EmbedCodeCard publicKey={publicKey} />}

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
        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground animate-in fade-in">
              <Loader2 className="h-3 w-3 animate-spin" />
              {tCommon("saving")}
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              <Check className="h-3 w-3" />
              {tCommon("saved")}
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-destructive animate-in fade-in">
              {t("saveError")}
            </span>
          )}
          <Button
            type="button"
            onClick={saveNow}
            disabled={saveStatus === "saving" || !hasChanges}
            size="sm"
            className="bg-cta hover:bg-cta/90 text-white"
          >
            {tCommon("save")}
          </Button>
        </div>
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
            <WidgetPreview appearance={appearance} activeSection={activeSection} />
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
        <span className="text-sm font-medium">{t("preview")}</span>
      </button>

      {/* Mobile Preview Drawer */}
      <Drawer open={mobilePreview} onOpenChange={setMobilePreview}>
        <DrawerContent className="flex flex-col max-h-[85vh]">
          <DrawerHeader className="text-left shrink-0">
            <DrawerTitle>{t("preview")}</DrawerTitle>
          </DrawerHeader>
          <div className="flex-1 min-h-0 px-4 pb-6">
            <WidgetPreview appearance={appearance} activeSection={activeSection} fillHeight />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
