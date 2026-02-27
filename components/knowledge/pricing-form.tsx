"use client";

import { useCallback, useState } from "react";
import { DollarSign, Plus, Trash2 } from "lucide-react";

import type { PricingData, ServiceItem } from "@/lib/knowledge/pricing";
import { CURRENCY_OPTIONS } from "@/lib/knowledge/pricing";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// ─── Props ───────────────────────────────────────────────────────

interface PricingFormProps {
  data: PricingData;
  onChange: (data: PricingData) => void;
  t: (key: string, values?: Record<string, unknown>) => string;
}

// ─── Main Component ──────────────────────────────────────────────

export function PricingForm({ data, onChange, t }: PricingFormProps) {
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // ─── Item helpers ─────────────────────────────────────────────

  const addItem = useCallback(() => {
    onChange({
      ...data,
      items: [...data.items, { name: "", price: "", description: "" }],
    });
  }, [data, onChange]);

  const updateItem = useCallback(
    (index: number, patch: Partial<ServiceItem>) => {
      const updated = data.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      );
      onChange({ ...data, items: updated });
    },
    [data, onChange],
  );

  const removeItem = useCallback(
    (index: number) => {
      onChange({
        ...data,
        items: data.items.filter((_, i) => i !== index),
      });
    },
    [data, onChange],
  );

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* ── Currency Selector ─────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="pricing-currency" className="text-sm font-semibold">
          {t("currency")}
        </Label>
        <Select
          value={data.currency}
          onValueChange={(value) => onChange({ ...data, currency: value })}
        >
          <SelectTrigger
            id="pricing-currency"
            className="w-full dark:border-muted-foreground/20 dark:bg-muted/30"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CURRENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Service Items ─────────────────────────────────────── */}
      {data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <DollarSign className="size-10 text-cta/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            {t("emptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t("emptyDescription")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.items.map((item, index) => (
            <ServiceItemRow
              key={index}
              item={item}
              index={index}
              t={t}
              onUpdate={(patch) => updateItem(index, patch)}
              onRequestDelete={() => setDeleteIndex(index)}
            />
          ))}
        </div>
      )}

      {/* ── Add Service Button ────────────────────────────────── */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addItem}
      >
        <Plus />
        {t("addService")}
      </Button>

      {/* ── Notes ─────────────────────────────────────────────── */}
      <div className="space-y-2">
        <Label htmlFor="pricing-notes" className="text-sm font-semibold">
          {t("notes")}
        </Label>
        <Textarea
          id="pricing-notes"
          rows={2}
          maxLength={500}
          placeholder={t("notesPlaceholder")}
          className="min-h-0 dark:border-muted-foreground/20 dark:bg-muted/30"
          value={data.notes ?? ""}
          onChange={(e) => onChange({ ...data, notes: e.target.value })}
        />
        <p className="text-xs text-muted-foreground text-right">
          {(data.notes?.length ?? 0)}/500
        </p>
      </div>

      {/* ── Delete Confirmation ───────────────────────────────── */}
      <ConfirmDialog
        open={deleteIndex !== null}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription")}
        onConfirm={() => {
          if (deleteIndex !== null) {
            removeItem(deleteIndex);
            setDeleteIndex(null);
          }
        }}
        onCancel={() => setDeleteIndex(null)}
      />
    </div>
  );
}

// ─── ServiceItemRow ──────────────────────────────────────────────

interface ServiceItemRowProps {
  item: ServiceItem;
  index: number;
  t: (key: string, values?: Record<string, unknown>) => string;
  onUpdate: (patch: Partial<ServiceItem>) => void;
  onRequestDelete: () => void;
}

function ServiceItemRow({
  item,
  index,
  t,
  onUpdate,
  onRequestDelete,
}: ServiceItemRowProps) {
  /** Allow only digits, one dot, and up to 2 decimal places */
  const handlePriceChange = (raw: string) => {
    // Strip anything that isn't a digit or dot
    let sanitized = raw.replace(/[^\d.]/g, "");
    // Only allow one dot
    const parts = sanitized.split(".");
    if (parts.length > 2) sanitized = `${parts[0]}.${parts[1]}`;
    // Limit to 2 decimal places
    if (parts.length === 2 && parts[1].length > 2) {
      sanitized = `${parts[0]}.${parts[1].slice(0, 2)}`;
    }
    // Cap at 10 chars (e.g. 9999999.99)
    onUpdate({ price: sanitized.slice(0, 10) });
  };

  return (
    <div className="rounded-lg border bg-background p-4 space-y-3 dark:border-muted-foreground/20">
      {/* Service Name + Price — stacked on mobile, side-by-side on sm+ */}
      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        {/* Service Name */}
        <div className="space-y-1">
          <Label
            htmlFor={`service-name-${index}`}
            className="text-xs text-muted-foreground"
          >
            {t("serviceName")}
          </Label>
          <Input
            id={`service-name-${index}`}
            placeholder={t("serviceNamePlaceholder")}
            value={item.name}
            maxLength={100}
            onChange={(e) => onUpdate({ name: e.target.value })}
            className="dark:border-muted-foreground/20 dark:bg-muted/30"
            aria-label={`${t("serviceName")} ${index + 1}`}
          />
          <p className="text-xs text-muted-foreground text-right">
            {item.name.length}/100
          </p>
        </div>

        {/* Price — numeric only */}
        <div className="space-y-1">
          <Label
            htmlFor={`service-price-${index}`}
            className="text-xs text-muted-foreground"
          >
            {t("price")}
          </Label>
          <Input
            id={`service-price-${index}`}
            inputMode="decimal"
            placeholder={t("pricePlaceholder")}
            value={item.price}
            onChange={(e) => handlePriceChange(e.target.value)}
            className="dark:border-muted-foreground/20 dark:bg-muted/30"
            aria-label={`${t("price")} ${index + 1}`}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label
          htmlFor={`service-desc-${index}`}
          className="text-xs text-muted-foreground"
        >
          {t("descriptionLabel")}
        </Label>
        <Textarea
          id={`service-desc-${index}`}
          rows={2}
          maxLength={300}
          placeholder={t("descriptionPlaceholder")}
          className="min-h-0 dark:border-muted-foreground/20 dark:bg-muted/30"
          value={item.description ?? ""}
          onChange={(e) => onUpdate({ description: e.target.value })}
          aria-label={`${t("descriptionLabel")} ${index + 1}`}
        />
        <p className="text-xs text-muted-foreground text-right">
          {(item.description?.length ?? 0)}/300
        </p>
      </div>

      {/* Delete — bottom right */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive/70 hover:text-destructive"
          onClick={onRequestDelete}
          aria-label={`${t("deleteConfirmTitle")} ${index + 1}`}
        >
          <Trash2 className="size-3.5 mr-1.5" />
          {t("deleteService")}
        </Button>
      </div>
    </div>
  );
}
