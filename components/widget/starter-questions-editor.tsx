"use client";

import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StarterQuestion } from "@/lib/widget/appearance";

// ─── Sortable Row ────────────────────────────────────────────────

interface SortableRowProps {
  question: StarterQuestion;
  onUpdate: (id: string, field: "textEn" | "textEs", value: string) => void;
  onRemove: (id: string) => void;
  placeholderEn: string;
  placeholderEs: string;
}

function SortableQuestionRow({ question, onUpdate, onRemove, placeholderEn, placeholderEs }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-2 rounded-lg border bg-card p-3">
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="mt-2.5 cursor-grab text-muted-foreground hover:text-foreground"
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="grid flex-1 gap-2 sm:grid-cols-2">
        <Input
          value={question.textEn}
          onChange={(e) => onUpdate(question.id, "textEn", e.target.value)}
          placeholder={placeholderEn}
          maxLength={100}
          className="text-sm"
        />
        <Input
          value={question.textEs}
          onChange={(e) => onUpdate(question.id, "textEs", e.target.value)}
          placeholder={placeholderEs}
          maxLength={100}
          className="text-sm"
        />
      </div>

      <button
        type="button"
        onClick={() => onRemove(question.id)}
        className="mt-2.5 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Editor ──────────────────────────────────────────────────────

interface StarterQuestionsEditorProps {
  questions: StarterQuestion[];
  onChange: (questions: StarterQuestion[]) => void;
}

export function StarterQuestionsEditor({ questions, onChange }: StarterQuestionsEditorProps) {
  const t = useTranslations("settings.widgetAppearance");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => q.id === active.id);
      const newIndex = questions.findIndex((q) => q.id === over.id);
      onChange(arrayMove(questions, oldIndex, newIndex));
    }
  }

  function addQuestion() {
    if (questions.length >= 5) return;
    onChange([...questions, { id: crypto.randomUUID(), textEn: "", textEs: "" }]);
  }

  function removeQuestion(id: string) {
    onChange(questions.filter((q) => q.id !== id));
  }

  function updateQuestion(id: string, field: "textEn" | "textEs", value: string) {
    onChange(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">{t("starterQuestionsLabel")}</Label>
        <span className="text-xs text-muted-foreground">{questions.length}/5</span>
      </div>

      {/* Column headers */}
      {questions.length > 0 && (
        <div className="flex items-center gap-2 px-1">
          <div className="w-4" />
          <div className="grid flex-1 gap-2 sm:grid-cols-2">
            <span className="text-xs font-medium text-muted-foreground">{t("english")}</span>
            <span className="hidden text-xs font-medium text-muted-foreground sm:block">{t("spanish")}</span>
          </div>
          <div className="w-4" />
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {questions.map((q) => (
              <SortableQuestionRow
                key={q.id}
                question={q}
                onUpdate={updateQuestion}
                onRemove={removeQuestion}
                placeholderEn={t("starterPlaceholderEn")}
                placeholderEs={t("starterPlaceholderEs")}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {questions.length < 5 && (
        <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="w-full">
          <Plus className="mr-1.5 h-4 w-4" />
          {t("addStarterQuestion")}
        </Button>
      )}
    </div>
  );
}
