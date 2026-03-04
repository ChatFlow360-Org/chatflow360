"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Trash2, Shield } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { PoliciesData } from "@/lib/knowledge/policies";
import { POLICY_PRESETS, type PolicyPreset } from "@/lib/knowledge/policies";

// ─── Constants ────────────────────────────────────────────────────

const TITLE_MAX = 100;
const CONTENT_MAX = 2000;

// ─── Props ────────────────────────────────────────────────────────

interface PoliciesFormProps {
  data: PoliciesData;
  onChange: (data: PoliciesData) => void;
  t: (key: string, values?: Record<string, unknown>) => string;
  locale?: string;
}

// ─── Main Component ──────────────────────────────────────────────

export function PoliciesForm({ data, onChange, t, locale = "en" }: PoliciesFormProps) {
  // Tracks which accordion items are expanded (by index-based key)
  const [expandedItems, setExpandedItems] = useState<string[]>(() =>
    data.items.map((_, i) => `policy-${i}`),
  );

  // ConfirmDialog: deleteIndex state pattern
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // ─── Item Helpers ──────────────────────────────────────────────

  const updateItem = useCallback(
    (index: number, patch: Partial<PoliciesData["items"][number]>) => {
      const updated = data.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      );
      onChange({ ...data, items: updated });
    },
    [data, onChange],
  );

  const addItem = useCallback(() => {
    const newIndex = data.items.length;
    const newKey = `policy-${newIndex}`;
    onChange({
      ...data,
      items: [...data.items, { title: "", content: "" }],
    });
    // Auto-expand the new item
    setExpandedItems((prev) => [...prev, newKey]);
  }, [data, onChange]);

  const removeItem = useCallback(
    (index: number) => {
      onChange({
        ...data,
        items: data.items.filter((_, i) => i !== index),
      });
      // Clean up expanded state — re-index remaining items
      setExpandedItems((prev) => {
        const next: string[] = [];
        for (const key of prev) {
          const match = key.match(/^policy-(\d+)$/);
          if (!match) continue;
          const idx = parseInt(match[1], 10);
          if (idx === index) continue;
          // Shift indices above the removed one
          next.push(`policy-${idx > index ? idx - 1 : idx}`);
        }
        return next;
      });
      setDeleteIndex(null);
    },
    [data, onChange],
  );

  // ─── Preset helpers ──────────────────────────────────────────

  const addPresetPolicy = useCallback(
    (preset: PolicyPreset) => {
      const label = locale === "es" ? preset.nameEs : preset.name;
      const alreadyExists = data.items.some(
        (item) => item.title.toLowerCase() === label.toLowerCase(),
      );
      if (alreadyExists) return;

      const newIndex = data.items.length;
      const newKey = `policy-${newIndex}`;
      onChange({
        ...data,
        items: [...data.items, { title: label, content: "" }],
      });
      setExpandedItems((prev) => [...prev, newKey]);
    },
    [data, onChange, locale],
  );

  const availablePresetsCommon = useMemo(
    () =>
      POLICY_PRESETS.filter(
        (p) =>
          p.group === "common" &&
          !data.items.some(
            (item) =>
              item.title.toLowerCase() === (locale === "es" ? p.nameEs : p.name).toLowerCase(),
          ),
      ),
    [data.items, locale],
  );

  const availablePresetsOther = useMemo(
    () =>
      POLICY_PRESETS.filter(
        (p) =>
          p.group === "other" &&
          !data.items.some(
            (item) =>
              item.title.toLowerCase() === (locale === "es" ? p.nameEs : p.name).toLowerCase(),
          ),
      ),
    [data.items, locale],
  );

  // ─── Quick-add chips renderer ───────────────────────────────

  const renderPresetChips = () => {
    if (availablePresetsCommon.length === 0 && availablePresetsOther.length === 0) return null;

    return (
      <div className="space-y-3">
        {availablePresetsCommon.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-normal">
              {t("quickAddCommon")}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {availablePresetsCommon.map((preset) => (
                <Badge
                  key={preset.key}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => addPresetPolicy(preset)}
                >
                  <Plus className="size-3 mr-0.5" />
                  {locale === "es" ? preset.nameEs : preset.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {availablePresetsOther.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-normal">
              {t("quickAddOther")}
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {availablePresetsOther.map((preset) => (
                <Badge
                  key={preset.key}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={() => addPresetPolicy(preset)}
                >
                  <Plus className="size-3 mr-0.5" />
                  {locale === "es" ? preset.nameEs : preset.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Render: Empty State ───────────────────────────────────────

  if (data.items.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="size-10 text-cta/40 mb-3" />
          <p className="text-sm font-medium text-foreground">
            {t("emptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("emptyDescription")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full border-cta/30 text-cta hover:bg-cta/10 hover:text-cta"
          onClick={addItem}
        >
          <Plus className="size-4" />
          {t("addPolicy")}
        </Button>

        {renderPresetChips()}
      </div>
    );
  }

  // ─── Render: Accordion List ────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Item count */}
      <p className="text-xs text-muted-foreground">
        {t("itemCount", { count: data.items.length })}
      </p>

      <Accordion
        type="multiple"
        value={expandedItems}
        onValueChange={setExpandedItems}
      >
        {data.items.map((item, index) => {
          const key = `policy-${index}`;
          const displayTitle = item.title.trim() || t("newPolicy");

          return (
            <AccordionItem key={key} value={key}>
              <div className="flex items-center gap-1">
                <AccordionTrigger className="flex-1 gap-2 min-w-0 hover:no-underline">
                  <span className="flex-1 truncate text-left">
                    {displayTitle}
                  </span>
                </AccordionTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="text-destructive/70 hover:text-destructive shrink-0"
                  onClick={() => setDeleteIndex(index)}
                  aria-label={t("deleteConfirmTitle")}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <AccordionContent>
                <div className="space-y-4 pt-1">
                  {/* Title field */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`policy-title-${index}`}
                      className="text-sm font-medium"
                    >
                      {t("policyTitle")}
                    </Label>
                    <Input
                      id={`policy-title-${index}`}
                      maxLength={TITLE_MAX}
                      placeholder={t("policyTitlePlaceholder")}
                      className="dark:border-muted-foreground/20 dark:bg-muted/30"
                      value={item.title}
                      onChange={(e) =>
                        updateItem(index, { title: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {item.title.length}/{TITLE_MAX}
                    </p>
                  </div>

                  {/* Content field */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`policy-content-${index}`}
                      className="text-sm font-medium"
                    >
                      {t("policyContent")}
                    </Label>
                    <Textarea
                      id={`policy-content-${index}`}
                      rows={4}
                      maxLength={CONTENT_MAX}
                      placeholder={t("policyContentPlaceholder")}
                      className="min-h-[6rem] dark:border-muted-foreground/20 dark:bg-muted/30"
                      value={item.content}
                      onChange={(e) =>
                        updateItem(index, { content: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {item.content.length}/{CONTENT_MAX}
                    </p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Add Policy button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full border-cta/30 text-cta hover:bg-cta/10 hover:text-cta"
        onClick={addItem}
      >
        <Plus className="size-4" />
        {t("addPolicy")}
      </Button>

      {renderPresetChips()}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteIndex !== null}
        onConfirm={() => {
          if (deleteIndex !== null) removeItem(deleteIndex);
        }}
        onCancel={() => setDeleteIndex(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription")}
        variant="destructive"
      />
    </div>
  );
}
