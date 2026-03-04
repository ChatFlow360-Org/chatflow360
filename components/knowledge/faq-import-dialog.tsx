"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Globe,
  FileCode2,
  Loader2,
  AlertTriangle,
  CheckCheck,
  Plus,
  Trash2,
  Info,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

import type { FAQItem } from "@/lib/knowledge/faqs";

// ─── Constants ───────────────────────────────────────────

const ITEMS_MAX = 20;
const URLS_MAX = 5;

// ─── Types ───────────────────────────────────────────────

interface ExtractedFAQ extends FAQItem {
  id: string;
}

type Phase = "idle" | "extracting" | "preview";

// ─── Props ───────────────────────────────────────────────

interface FaqImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (items: FAQItem[]) => void;
  currentCount: number;
  channelWebsiteUrl?: string;
  t: (key: string, values?: Record<string, unknown>) => string;
}

// ─── Component ───────────────────────────────────────────

export function FaqImportDialog({
  open,
  onClose,
  onImport,
  currentCount,
  channelWebsiteUrl,
  t,
}: FaqImportDialogProps) {
  const tCommon = useTranslations("common");

  // Tab control
  const [activeTab, setActiveTab] = useState<"text" | "url">("text");

  // Input fields
  const [urls, setUrls] = useState<string[]>([""]);
  const [pastedText, setPastedText] = useState("");

  // Extraction state
  const [phase, setPhase] = useState<Phase>("idle");
  const [extractedFaqs, setExtractedFaqs] = useState<ExtractedFAQ[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Reset & pre-populate when dialog opens
  useEffect(() => {
    if (open) {
      setUrls([channelWebsiteUrl || ""]);
      setPastedText("");
      setPhase("idle");
      setExtractedFaqs([]);
      setSelectedIds(new Set());
    }
  }, [open, channelWebsiteUrl]);

  // Computed
  const availableSlots = ITEMS_MAX - currentCount;
  const allIds = useMemo(
    () => extractedFaqs.map((f) => f.id),
    [extractedFaqs],
  );
  const maxSelectable = Math.min(allIds.length, availableSlots);
  const allSelectableSelected =
    selectedIds.size > 0 && selectedIds.size >= maxSelectable;

  // ─── URL list helpers ─────────────────────────────────────

  const addUrl = useCallback(() => {
    if (urls.length >= URLS_MAX) return;
    setUrls((prev) => [...prev, ""]);
  }, [urls.length]);

  const removeUrl = useCallback((index: number) => {
    setUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateUrl = useCallback((index: number, value: string) => {
    setUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }, []);

  // ─── Extract handler ────────────────────────────────────

  const handleExtract = useCallback(async () => {
    setPhase("extracting");
    setExtractedFaqs([]);
    setSelectedIds(new Set());

    try {
      const body =
        activeTab === "url"
          ? {
              source: "url",
              urls: urls
                .map((u) => u.trim())
                .filter((u) => u.length > 0),
            }
          : { source: "text", text: pastedText.trim() };

      const res = await fetch("/api/knowledge/extract-faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("import.extractError"));
      }

      // Show warnings for failed URLs
      if (
        Array.isArray(data.warnings) &&
        data.warnings.length > 0
      ) {
        toast.warning(
          t("import.urlFetchWarning", { count: data.warnings.length }),
        );
      }

      const faqs: ExtractedFAQ[] = (data.faqs as FAQItem[]).map(
        (item, i) => ({
          ...item,
          id: `extracted-${i}`,
        }),
      );

      if (faqs.length === 0) {
        toast.info(t("import.noFaqsFound"));
        setPhase("idle");
        return;
      }

      setExtractedFaqs(faqs);
      // Auto-select up to available slots
      const autoSelect = new Set(
        faqs.slice(0, availableSlots).map((f) => f.id),
      );
      setSelectedIds(autoSelect);
      setPhase("preview");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : t("import.extractError"),
      );
      setPhase("idle");
    }
  }, [activeTab, urls, pastedText, availableSlots, t]);

  // ─── Import handler ─────────────────────────────────────

  const handleImport = useCallback(() => {
    const selected = extractedFaqs
      .filter((f) => selectedIds.has(f.id))
      .map(({ question, answer }) => ({ question, answer }));

    if (selected.length === 0) return;

    onImport(selected);
    onClose();
  }, [extractedFaqs, selectedIds, onImport, onClose]);

  // ─── Close handler ──────────────────────────────────────

  const handleClose = useCallback(() => {
    if (phase === "extracting") return;
    onClose();
  }, [phase, onClose]);

  // ─── Can extract? ───────────────────────────────────────

  const canExtract =
    phase !== "extracting" &&
    (activeTab === "url"
      ? urls.some((u) => u.trim().length > 0)
      : pastedText.trim().length >= 50);

  // ─── Render ─────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("import.dialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("import.dialogDescription")}
          </DialogDescription>
        </DialogHeader>

        {/* Phase: idle or extracting — show input tabs */}
        {phase !== "preview" && (
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "text" | "url")}
          >
            <TabsList>
              <TabsTrigger
                value="text"
                disabled={phase === "extracting"}
                className="gap-1.5"
              >
                <FileCode2 className="size-3.5" />
                {t("import.tabText")}
              </TabsTrigger>
              <TabsTrigger
                value="url"
                disabled={phase === "extracting"}
                className="gap-1.5"
              >
                <Globe className="size-3.5" />
                {t("import.tabUrl")}
              </TabsTrigger>
            </TabsList>

            {/* From Text tab */}
            <TabsContent value="text" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {t("import.textLabel")}
                </Label>
                <Textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={t("import.textPlaceholder")}
                  rows={8}
                  maxLength={50000}
                  disabled={phase === "extracting"}
                  className="min-h-0 dark:border-muted-foreground/20 dark:bg-muted/30"
                />
                <p className="text-xs text-muted-foreground">
                  {t("import.textHint")}
                </p>
              </div>
            </TabsContent>

            {/* From URL tab */}
            <TabsContent value="url" className="mt-4 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {t("import.urlLabel")}
                </Label>

                {/* Dynamic URL list */}
                <div className="space-y-2">
                  {urls.map((urlValue, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="url"
                        value={urlValue}
                        onChange={(e) => updateUrl(index, e.target.value)}
                        placeholder={t("import.urlPlaceholder")}
                        disabled={phase === "extracting"}
                        className="dark:border-muted-foreground/20 dark:bg-muted/30"
                      />
                      {urls.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-8 shrink-0 text-destructive/70 hover:text-destructive"
                          onClick={() => removeUrl(index)}
                          disabled={phase === "extracting"}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add another URL */}
                {urls.length < URLS_MAX && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addUrl}
                    disabled={phase === "extracting"}
                    className="gap-1.5"
                  >
                    <Plus className="size-3.5" />
                    {t("import.addUrl")}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  {t("import.urlHint")}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {/* Phase: preview — show extracted FAQs */}
        {phase === "preview" && extractedFaqs.length > 0 && (
          <div className="space-y-3">
            {/* AI Disclaimer */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-400/30 dark:bg-amber-950/20">
              <Info className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                {t("import.aiDisclaimer")}
              </p>
            </div>

            {/* Select all + count */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="select-all-faqs"
                  checked={allSelectableSelected}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedIds(new Set(allIds.slice(0, availableSlots)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                />
                <Label
                  htmlFor="select-all-faqs"
                  className="text-sm cursor-pointer"
                >
                  {t("import.selectAll")} ({selectedIds.size}/
                  {extractedFaqs.length})
                </Label>
              </div>

              {/* Warning when extracted > available */}
              {extractedFaqs.length > availableSlots && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="size-3.5" />
                  <span>
                    {t("import.slotWarning", {
                      available: availableSlots,
                      total: extractedFaqs.length,
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Scrollable list */}
            <ScrollArea className="h-72 rounded-md border border-border dark:border-muted-foreground/20">
              <div className="space-y-2 p-3">
                {extractedFaqs.map((faq) => {
                  const isSelected = selectedIds.has(faq.id);
                  const isDisabled =
                    !isSelected && selectedIds.size >= availableSlots;
                  return (
                    <div
                      key={faq.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        isSelected
                          ? "border-cta/30 bg-cta/5 dark:bg-cta/10"
                          : isDisabled
                            ? "border-border/50 opacity-50"
                            : "border-border/50 hover:border-border"
                      }`}
                    >
                      <Checkbox
                        id={`faq-${faq.id}`}
                        checked={isSelected}
                        disabled={isDisabled}
                        onCheckedChange={(checked) => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (checked) next.add(faq.id);
                            else next.delete(faq.id);
                            return next;
                          });
                        }}
                        className="mt-0.5 shrink-0"
                      />
                      <label
                        htmlFor={`faq-${faq.id}`}
                        className="min-w-0 flex-1 space-y-1 cursor-pointer"
                      >
                        <p className="text-sm font-medium leading-snug">
                          {faq.question}
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </label>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            {tCommon("cancel")}
          </Button>

          {phase !== "preview" && (
            <Button
              type="button"
              onClick={handleExtract}
              disabled={!canExtract}
            >
              {phase === "extracting" ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t("import.extracting")}
                </>
              ) : (
                t("import.extractButton")
              )}
            </Button>
          )}

          {phase === "preview" && (
            <Button
              type="button"
              onClick={handleImport}
              disabled={selectedIds.size === 0}
            >
              <CheckCheck className="size-4" />
              {t("import.importSelected", { count: selectedIds.size })}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
