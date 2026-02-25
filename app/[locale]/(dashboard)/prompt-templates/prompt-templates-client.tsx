"use client";

import { useState, useActionState, useEffect, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  X,
  LayoutTemplate,
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createPromptTemplate,
  updatePromptTemplate,
  deletePromptTemplate,
} from "@/lib/admin/actions";
import { EMPTY_PROMPT_STRUCTURE, type PromptStructure } from "@/lib/chat/prompt-builder";
import { formatRelativeTime } from "@/lib/utils/format";

// --- Types ---

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  structure: PromptStructure;
  updatedAt: string;
}

interface PromptTemplatesClientProps {
  templates: TemplateData[];
}

// --- Component ---

export function PromptTemplatesClient({ templates }: PromptTemplatesClientProps) {
  const t = useTranslations("promptTemplates");
  const tSettings = useTranslations("settings");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  // Dialog state
  const [showDialog, setShowDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateData | null>(null);

  // Form state
  const [templateName, setTemplateName] = useState("");
  const [templateDescription, setTemplateDescription] = useState("");
  const [templateStructure, setTemplateStructure] = useState<PromptStructure>({ ...EMPTY_PROMPT_STRUCTURE });
  const [ruleInput, setRuleInput] = useState("");

  // Server action state
  const [createState, createAction, isCreating] = useActionState(createPromptTemplate, null);
  const [updateState, updateAction, isUpdating] = useActionState(updatePromptTemplate, null);
  const [isDeletingTemplate, startDeleteTransition] = useTransition();

  // Close dialog on success
  useEffect(() => {
    if (createState?.success || updateState?.success) {
      setShowDialog(false);
      resetForm();
    }
  }, [createState, updateState]);

  // --- Helpers ---
  const resetForm = () => {
    setEditingTemplate(null);
    setTemplateName("");
    setTemplateDescription("");
    setTemplateStructure({ ...EMPTY_PROMPT_STRUCTURE });
    setRuleInput("");
  };

  const openNewTemplate = () => {
    resetForm();
    setShowDialog(true);
  };

  const openEditTemplate = (tmpl: TemplateData) => {
    setEditingTemplate(tmpl);
    setTemplateName(tmpl.name);
    setTemplateDescription(tmpl.description || "");
    setTemplateStructure({ ...tmpl.structure });
    setRuleInput("");
    setShowDialog(true);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (!confirm(t("deleteConfirm"))) return;
    startDeleteTransition(async () => {
      await deletePromptTemplate(templateId);
    });
  };

  const addRule = () => {
    const rule = ruleInput.trim();
    if (rule && templateStructure.rules.length < 50) {
      setTemplateStructure((prev) => ({ ...prev, rules: [...prev.rules, rule] }));
      setRuleInput("");
    }
  };

  const removeRule = (index: number) => {
    setTemplateStructure((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button onClick={openNewTemplate}>
          <Plus className="mr-1.5 h-4 w-4" />
          {t("newTemplate")}
        </Button>
      </div>

      {/* Templates List */}
      {templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LayoutTemplate className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="text-sm font-medium">{t("noTemplates")}</h3>
            <p className="mt-1 text-center text-xs text-muted-foreground">
              {t("createFirst")}
            </p>
            <Button className="mt-4" size="sm" onClick={openNewTemplate}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("newTemplate")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tmpl) => (
            <Card key={tmpl.id} className="group relative transition-shadow hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base">{tmpl.name}</CardTitle>
                    {tmpl.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {tmpl.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-cta"
                      onClick={() => openEditTemplate(tmpl)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteTemplate(tmpl.id)}
                      disabled={isDeletingTemplate}
                    >
                      {isDeletingTemplate ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {tmpl.structure.agentName && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">{tmpl.structure.agentName}</span>
                  </div>
                )}
                {tmpl.structure.role && (
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {tmpl.structure.role}
                  </p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {tmpl.structure.rules.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {tSettings("templates.rulesCount", { count: tmpl.structure.rules.length })}
                    </Badge>
                  )}
                  {tmpl.structure.personality && (
                    <Badge variant="secondary" className="text-[10px]">
                      {tSettings("agentInstructions.personality")}
                    </Badge>
                  )}
                </div>
                <p className="pt-1 text-[10px] text-muted-foreground/50">
                  {t("updated")} {formatRelativeTime(tmpl.updatedAt, locale)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Create/Edit Template Dialog ── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); resetForm(); } }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? t("editTemplate") : t("newTemplate")}
            </DialogTitle>
            <DialogDescription>{t("subtitle")}</DialogDescription>
          </DialogHeader>
          <form action={editingTemplate ? updateAction : createAction}>
            {editingTemplate && (
              <input type="hidden" name="templateId" value={editingTemplate.id} />
            )}
            <input type="hidden" name="structure" value={JSON.stringify(templateStructure)} />
            <div className="space-y-4 py-2">
              {/* Template name */}
              <div className="space-y-2">
                <Label>{tSettings("templates.templateName")}</Label>
                <Input
                  name="name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={tSettings("templates.templateNamePlaceholder")}
                  maxLength={100}
                  required
                  autoComplete="off"
                  className="bg-background"
                />
              </div>
              {/* Template description */}
              <div className="space-y-2">
                <Label>{tSettings("templates.templateDescription")}</Label>
                <Input
                  name="description"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder={tSettings("templates.templateDescriptionPlaceholder")}
                  maxLength={500}
                  autoComplete="off"
                  className="bg-background"
                />
              </div>

              <Separator />

              {/* Agent Name */}
              <div className="space-y-2">
                <Label>{tSettings("agentInstructions.agentName")}</Label>
                <Input
                  value={templateStructure.agentName}
                  onChange={(e) => setTemplateStructure((prev) => ({ ...prev, agentName: e.target.value }))}
                  placeholder={tSettings("agentInstructions.agentNamePlaceholder")}
                  maxLength={100}
                  autoComplete="off"
                  className="bg-background"
                />
                <p className="text-[10px] text-muted-foreground/70">{tSettings("agentInstructions.agentNameHint")}</p>
              </div>
              {/* Role */}
              <div className="space-y-2">
                <Label>{tSettings("agentInstructions.role")}</Label>
                <Textarea
                  value={templateStructure.role}
                  onChange={(e) => setTemplateStructure((prev) => ({ ...prev, role: e.target.value }))}
                  placeholder={tSettings("agentInstructions.rolePlaceholder")}
                  rows={3}
                  maxLength={1000}
                  className="resize-none bg-background"
                />
                <p className="text-[10px] text-muted-foreground/70">{tSettings("agentInstructions.roleHint")}</p>
              </div>
              {/* Rules */}
              <div className="space-y-2">
                <Label>{tSettings("agentInstructions.rules")}</Label>
                {templateStructure.rules.length > 0 && (
                  <div className="space-y-1.5">
                    {templateStructure.rules.map((rule, index) => (
                      <div key={index} className="flex items-start gap-2 rounded-lg border bg-background px-3 py-1.5">
                        <span className="flex-1 text-xs">{rule}</span>
                        <button type="button" onClick={() => removeRule(index)} className="mt-0.5 shrink-0 rounded-full p-0.5 hover:bg-foreground/10">
                          <X className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    value={ruleInput}
                    onChange={(e) => setRuleInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRule(); } }}
                    placeholder={tSettings("agentInstructions.rulePlaceholder")}
                    maxLength={500}
                    disabled={templateStructure.rules.length >= 50}
                    autoComplete="off"
                    className="bg-background"
                  />
                  <Button type="button" size="sm" onClick={addRule} disabled={!ruleInput.trim() || templateStructure.rules.length >= 50}>
                    {tSettings("agentInstructions.addRule")}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground/70">
                  {tSettings("agentInstructions.rulesHint", { count: templateStructure.rules.length })}
                </p>
              </div>
              {/* Personality */}
              <div className="space-y-2">
                <Label>{tSettings("agentInstructions.personality")}</Label>
                <Textarea
                  value={templateStructure.personality}
                  onChange={(e) => setTemplateStructure((prev) => ({ ...prev, personality: e.target.value }))}
                  placeholder={tSettings("agentInstructions.personalityPlaceholder")}
                  rows={2}
                  maxLength={1000}
                  className="resize-none bg-background"
                />
                <p className="text-[10px] text-muted-foreground/70">{tSettings("agentInstructions.personalityHint")}</p>
              </div>
              {/* Additional Instructions */}
              <div className="space-y-2">
                <Label>{tSettings("agentInstructions.additionalInstructions")}</Label>
                <Textarea
                  value={templateStructure.additionalInstructions}
                  onChange={(e) => setTemplateStructure((prev) => ({ ...prev, additionalInstructions: e.target.value }))}
                  placeholder={tSettings("agentInstructions.additionalInstructionsPlaceholder")}
                  rows={2}
                  maxLength={2000}
                  className="resize-none bg-background"
                />
                <p className="text-[10px] text-muted-foreground/70">
                  {tSettings("agentInstructions.additionalInstructionsDescription")}
                </p>
              </div>

              {/* Error feedback */}
              {(createState?.error || updateState?.error) && (
                <p className="text-sm text-destructive">
                  {createState?.error === "templateNameExists" || updateState?.error === "templateNameExists"
                    ? tSettings("templates.templateNameExists")
                    : tSettings("templates.createError")}
                </p>
              )}
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => { setShowDialog(false); resetForm(); }}>
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isCreating || isUpdating || !templateName.trim()}>
                {(isCreating || isUpdating) ? (
                  <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" />{tSettings("templates.saving")}</>
                ) : tSettings("templates.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
