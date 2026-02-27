"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2, HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
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

import type { FAQsData } from "@/lib/knowledge/faqs";

// ─── Constants ───────────────────────────────────────────────────

const QUESTION_MAX = 300;
const ANSWER_MAX = 1000;

// ─── Props ───────────────────────────────────────────────────────

interface FAQsFormProps {
  data: FAQsData;
  onChange: (data: FAQsData) => void;
  t: (key: string, values?: Record<string, unknown>) => string;
}

// ─── Main Component ──────────────────────────────────────────────

export function FAQsForm({ data, onChange, t }: FAQsFormProps) {
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // ─── Item helpers ─────────────────────────────────────────────

  const updateItem = useCallback(
    (index: number, patch: Partial<{ question: string; answer: string }>) => {
      const updated = data.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      );
      onChange({ ...data, items: updated });
    },
    [data, onChange],
  );

  const addItem = useCallback(() => {
    const newIndex = data.items.length;
    const itemKey = `faq-${newIndex}`;
    onChange({
      ...data,
      items: [...data.items, { question: "", answer: "" }],
    });
    setExpandedItems((prev) => [...prev, itemKey]);
  }, [data, onChange]);

  const removeItem = useCallback(
    (index: number) => {
      const itemKey = `faq-${index}`;
      onChange({
        ...data,
        items: data.items.filter((_, i) => i !== index),
      });
      // Clean up expanded state — remove the deleted key and re-index keys above it
      setExpandedItems((prev) =>
        prev
          .filter((key) => key !== itemKey)
          .map((key) => {
            const keyIndex = parseInt(key.replace("faq-", ""), 10);
            if (keyIndex > index) return `faq-${keyIndex - 1}`;
            return key;
          }),
      );
    },
    [data, onChange],
  );

  const handleConfirmDelete = useCallback(() => {
    if (deleteIndex !== null) {
      removeItem(deleteIndex);
      setDeleteIndex(null);
    }
  }, [deleteIndex, removeItem]);

  // ─── Empty state ──────────────────────────────────────────────

  if (data.items.length === 0) {
    return (
      <div className="space-y-5">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <HelpCircle className="size-10 text-cta/40 mb-3" />
          <p className="text-sm font-medium text-foreground">
            {t("emptyTitle")}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
            {t("emptyDescription")}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-4 border-cta/30 text-cta hover:bg-cta/10 hover:text-cta"
            onClick={addItem}
          >
            <Plus className="size-4" />
            {t("addFaq")}
          </Button>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Item count */}
      <p className="text-xs text-muted-foreground">
        {t("itemCount", { count: data.items.length })}
      </p>

      {/* Accordion list */}
      <Accordion
        type="multiple"
        value={expandedItems}
        onValueChange={setExpandedItems}
        className="space-y-2"
      >
        {data.items.map((item, index) => {
          const itemKey = `faq-${index}`;
          return (
            <AccordionItem
              key={itemKey}
              value={itemKey}
              className="rounded-lg border border-border px-4 dark:border-muted-foreground/20"
            >
              {/* ── Trigger row: accordion trigger + delete (side by side, no nesting) ── */}
              <div className="flex items-center gap-1">
                <AccordionTrigger className="flex-1 gap-2 min-w-0">
                  <span className="truncate text-left text-sm font-medium">
                    {item.question || t("newQuestion")}
                  </span>
                </AccordionTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteIndex(index)}
                  aria-label={t("deleteConfirmTitle")}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>

              {/* ── Content: editable fields ── */}
              <AccordionContent className="space-y-4 pt-2">
                {/* Question field */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`faq-question-${index}`}
                    className="text-sm font-medium"
                  >
                    {t("questionLabel")}
                  </Label>
                  <Input
                    id={`faq-question-${index}`}
                    value={item.question}
                    onChange={(e) =>
                      updateItem(index, {
                        question: e.target.value.slice(0, QUESTION_MAX),
                      })
                    }
                    placeholder={t("questionPlaceholder")}
                    maxLength={QUESTION_MAX}
                    className="dark:border-muted-foreground/20 dark:bg-muted/30"
                    aria-label={t("questionLabel")}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {item.question.length}/{QUESTION_MAX}
                  </p>
                </div>

                {/* Answer field */}
                <div className="space-y-1.5">
                  <Label
                    htmlFor={`faq-answer-${index}`}
                    className="text-sm font-medium"
                  >
                    {t("answerLabel")}
                  </Label>
                  <Textarea
                    id={`faq-answer-${index}`}
                    value={item.answer}
                    onChange={(e) =>
                      updateItem(index, {
                        answer: e.target.value.slice(0, ANSWER_MAX),
                      })
                    }
                    placeholder={t("answerPlaceholder")}
                    maxLength={ANSWER_MAX}
                    rows={3}
                    className="min-h-0 dark:border-muted-foreground/20 dark:bg-muted/30"
                    aria-label={t("answerLabel")}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {item.answer.length}/{ANSWER_MAX}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Add FAQ button */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-cta/30 text-cta hover:bg-cta/10 hover:text-cta"
        onClick={addItem}
      >
        <Plus className="size-4" />
        {t("addFaq")}
      </Button>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteIndex !== null}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteIndex(null)}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDescription")}
        variant="destructive"
      />
    </div>
  );
}
