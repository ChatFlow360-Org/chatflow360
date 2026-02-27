"use client";

import { useState, useActionState, useEffect, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Eye,
  X,
  Building2,
  Plus,
  Trash2,
  Bot,
  BookOpen,
  FileText,
  Loader2,
  Pencil,
  Palette,
  LayoutTemplate,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  HelpCircle,
  DollarSign,
  MapPin,
  Shield,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  upsertAiSettings,
  createKnowledgeItem,
  updateKnowledgeItem,
  deleteKnowledgeItem,
  upsertBusinessHours,
  upsertStructuredKnowledge,
} from "@/lib/admin/actions";
import { DEFAULT_HANDOFF_KEYWORDS } from "@/lib/chat/defaults";
import { EMPTY_PROMPT_STRUCTURE, type PromptStructure } from "@/lib/chat/prompt-builder";
import { formatRelativeTime } from "@/lib/utils/format";
import { BusinessHoursForm } from "@/components/knowledge/business-hours-form";
import { DEFAULT_BUSINESS_HOURS } from "@/lib/knowledge/business-hours";
import type { BusinessHoursData, KnowledgeCategory } from "@/lib/knowledge/business-hours";
import { FAQsForm } from "@/components/knowledge/faqs-form";
import { DEFAULT_FAQS } from "@/lib/knowledge/faqs";
import type { FAQsData } from "@/lib/knowledge/faqs";
import { PricingForm } from "@/components/knowledge/pricing-form";
import { DEFAULT_PRICING } from "@/lib/knowledge/pricing";
import type { PricingData } from "@/lib/knowledge/pricing";
import { LocationContactForm } from "@/components/knowledge/location-contact-form";
import { DEFAULT_LOCATION_CONTACT } from "@/lib/knowledge/location-contact";
import type { LocationContactData } from "@/lib/knowledge/location-contact";
import { PoliciesForm } from "@/components/knowledge/policies-form";
import { DEFAULT_POLICIES } from "@/lib/knowledge/policies";
import type { PoliciesData } from "@/lib/knowledge/policies";
import { AppearanceForm } from "@/components/widget/appearance-form";
import type { WidgetAppearance } from "@/lib/widget/appearance";

// --- Types ---

interface AiSettingsData {
  id: string;
  organizationId: string;
  provider: string;
  model: string;
  systemPrompt: string | null;
  temperature: number;
  maxTokens: number;
  handoffKeywords: string[];
  apiKeyHint: string | null;
  promptStructure: PromptStructure | null;
}

interface KnowledgeItemData {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  structured_data: Record<string, unknown> | null;
  tokens_used: number;
  created_at: string;
}

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  structure: PromptStructure;
}

interface AiSettingsClientProps {
  selectedOrgId: string;
  organizationName: string;
  aiSettings: AiSettingsData | null;
  isSuperAdmin: boolean;
  knowledgeItems: KnowledgeItemData[];
  templates: TemplateData[];
  widgetChannelId?: string;
  widgetPublicKey?: string;
  widgetAppearance?: WidgetAppearance;
}

// --- Component ---

export function AiSettingsClient({
  selectedOrgId,
  organizationName,
  aiSettings,
  isSuperAdmin,
  knowledgeItems,
  templates,
  widgetChannelId,
  widgetPublicKey,
  widgetAppearance,
}: AiSettingsClientProps) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tAdmin = useTranslations("admin.errors");
  const locale = useLocale();

  const [state, formAction, isPending] = useActionState(
    upsertAiSettings,
    null
  );

  // Knowledge state
  const [createState, createAction, isCreating] = useActionState(
    createKnowledgeItem,
    null
  );
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addCategory, setAddCategory] = useState<KnowledgeCategory | null>(null);
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeletePending, startDeleteTransition] = useTransition();

  // Edit knowledge state
  const [updateState, updateAction, isUpdating] = useActionState(
    updateKnowledgeItem,
    null
  );
  const [editingItem, setEditingItem] = useState<KnowledgeItemData | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  // Business hours state
  const existingBH = knowledgeItems.find((i) => i.category === "business_hours");
  const [showBHDialog, setShowBHDialog] = useState(false);
  const [bhData, setBhData] = useState<BusinessHoursData>(
    () => (existingBH?.structured_data as unknown as BusinessHoursData) ?? { ...DEFAULT_BUSINESS_HOURS }
  );
  const [bhState, bhAction, isBHSaving] = useActionState(upsertBusinessHours, null);

  // FAQs state
  const existingFaqs = knowledgeItems.find((i) => i.category === "faqs");
  const [showFaqsDialog, setShowFaqsDialog] = useState(false);
  const [faqsData, setFaqsData] = useState<FAQsData>(
    () => (existingFaqs?.structured_data as unknown as FAQsData) ?? { ...DEFAULT_FAQS }
  );
  const [faqsState, faqsAction, isFaqsSaving] = useActionState(upsertStructuredKnowledge, null);

  // Pricing state
  const existingPricing = knowledgeItems.find((i) => i.category === "pricing");
  const [showPricingDialog, setShowPricingDialog] = useState(false);
  const [pricingData, setPricingData] = useState<PricingData>(
    () => (existingPricing?.structured_data as unknown as PricingData) ?? { ...DEFAULT_PRICING }
  );
  const [pricingState, pricingAction, isPricingSaving] = useActionState(upsertStructuredKnowledge, null);

  // Location & Contact state
  const existingLocation = knowledgeItems.find((i) => i.category === "location_contact");
  const [showLocationDialog, setShowLocationDialog] = useState(false);
  const [locationData, setLocationData] = useState<LocationContactData>(
    () => (existingLocation?.structured_data as unknown as LocationContactData) ?? { ...DEFAULT_LOCATION_CONTACT }
  );
  const [locationState, locationAction, isLocationSaving] = useActionState(upsertStructuredKnowledge, null);

  // Policies state
  const existingPolicies = knowledgeItems.find((i) => i.category === "policies");
  const [showPoliciesDialog, setShowPoliciesDialog] = useState(false);
  const [policiesData, setPoliciesData] = useState<PoliciesData>(
    () => (existingPolicies?.structured_data as unknown as PoliciesData) ?? { ...DEFAULT_POLICIES }
  );
  const [policiesState, policiesAction, isPoliciesSaving] = useActionState(upsertStructuredKnowledge, null);

  // Structured categories (not free_text)
  const STRUCTURED_CATEGORIES: KnowledgeCategory[] = ["business_hours", "faqs", "pricing", "location_contact", "policies"];

  // Filter free-text items for the list
  const freeTextItems = knowledgeItems.filter((i) => !STRUCTURED_CATEGORIES.includes(i.category));

  // Smooth scroll to top so user sees feedback banners
  // Dashboard layout uses <main> with overflow-y-auto, not window scroll
  const scrollToTop = () =>
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });

  // Close dialog on successful create
  useEffect(() => {
    if (createState?.success) {
      setShowAddDialog(false);
      setAddCategory(null);
      setKnowledgeTitle("");
      setKnowledgeContent("");
      scrollToTop();
    }
  }, [createState]);

  // Close edit dialog on successful update
  useEffect(() => {
    if (updateState?.success) {
      setEditingItem(null);
      setEditTitle("");
      setEditContent("");
      scrollToTop();
    }
  }, [updateState]);

  // Close BH dialog on successful save
  useEffect(() => {
    if (bhState?.success) {
      setShowBHDialog(false);
      scrollToTop();
    }
  }, [bhState]);

  // Close structured knowledge dialogs on successful save
  useEffect(() => {
    if (faqsState?.success) { setShowFaqsDialog(false); scrollToTop(); }
  }, [faqsState]);
  useEffect(() => {
    if (pricingState?.success) { setShowPricingDialog(false); scrollToTop(); }
  }, [pricingState]);
  useEffect(() => {
    if (locationState?.success) { setShowLocationDialog(false); scrollToTop(); }
  }, [locationState]);
  useEffect(() => {
    if (policiesState?.success) { setShowPoliciesDialog(false); scrollToTop(); }
  }, [policiesState]);

  // Scroll to top on main save success/error
  useEffect(() => {
    if (state?.success || state?.error) scrollToTop();
  }, [state]);

  // Form state — technical params (editable by super_admin)
  const [model, setModel] = useState(aiSettings?.model || "gpt-4o-mini");
  const [temperature, setTemperature] = useState(aiSettings?.temperature ?? 0.7);
  const [maxTokens, setMaxTokens] = useState(aiSettings?.maxTokens || 500);

  // Structured prompt state
  const hasLegacyPrompt = !aiSettings?.promptStructure && !!aiSettings?.systemPrompt;
  const [promptStructure, setPromptStructure] = useState<PromptStructure>(() => {
    if (aiSettings?.promptStructure) return { ...EMPTY_PROMPT_STRUCTURE, ...aiSettings.promptStructure };
    // Legacy migration: move old systemPrompt into additionalInstructions
    if (hasLegacyPrompt) return { ...EMPTY_PROMPT_STRUCTURE, additionalInstructions: aiSettings.systemPrompt! };
    return { ...EMPTY_PROMPT_STRUCTURE };
  });
  const [ruleInput, setRuleInput] = useState("");
  const [showAdditional, setShowAdditional] = useState(
    () => !!(aiSettings?.promptStructure?.additionalInstructions) || hasLegacyPrompt
  );

  // Template selector state
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  const resolveKeywords = (settings: AiSettingsData | null): string[] => {
    if (!settings) return [...DEFAULT_HANDOFF_KEYWORDS];
    return settings.handoffKeywords.length > 0 ? settings.handoffKeywords : [...DEFAULT_HANDOFF_KEYWORDS];
  };

  const [keywords, setKeywords] = useState<string[]>(resolveKeywords(aiSettings));
  const [keywordInput, setKeywordInput] = useState("");

  // Reset form when org changes
  useEffect(() => {
    const legacy = !aiSettings?.promptStructure && !!aiSettings?.systemPrompt;
    if (aiSettings?.promptStructure) {
      setPromptStructure({ ...EMPTY_PROMPT_STRUCTURE, ...aiSettings.promptStructure });
    } else if (legacy) {
      setPromptStructure({ ...EMPTY_PROMPT_STRUCTURE, additionalInstructions: aiSettings.systemPrompt! });
    } else {
      setPromptStructure({ ...EMPTY_PROMPT_STRUCTURE });
    }
    setRuleInput("");
    setShowAdditional(!!(aiSettings?.promptStructure?.additionalInstructions) || legacy);
    setModel(aiSettings?.model || "gpt-4o-mini");
    setTemperature(aiSettings?.temperature ?? 0.7);
    setMaxTokens(aiSettings?.maxTokens || 500);
    const resolved = resolveKeywords(aiSettings);
    setKeywords(resolved);
    setKeywordInput("");
  }, [aiSettings]);

  // --- No org selected state ---
  if (!selectedOrgId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="rounded-full bg-muted p-4">
              <Building2 className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <p className="mt-4 text-sm font-medium text-muted-foreground">
              {t("selectOrgFirst")}
            </p>
            <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground/70">
              {t("selectOrgDescription")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- Keyword helpers ---
  const addKeyword = () => {
    const kw = keywordInput.trim().toLowerCase();
    if (kw && !keywords.includes(kw) && keywords.length < 20) {
      setKeywords([...keywords, kw]);
      setKeywordInput("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addKeyword();
    }
  };

  // --- Rule helpers ---
  const addRule = () => {
    const rule = ruleInput.trim();
    if (rule && promptStructure.rules.length < 50) {
      setPromptStructure((prev) => ({ ...prev, rules: [...prev.rules, rule] }));
      setRuleInput("");
    }
  };
  const removeRule = (index: number) => {
    setPromptStructure((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };
  const handleRuleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") { e.preventDefault(); addRule(); }
  };

  // --- Knowledge edit handler ---
  const handleEditKnowledge = (item: KnowledgeItemData) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditContent(item.content);
  };

  // --- Knowledge delete handler ---
  const handleDeleteKnowledge = (knowledgeId: string) => {
    setDeletingId(knowledgeId);
    startDeleteTransition(async () => {
      await deleteKnowledgeItem(selectedOrgId, knowledgeId);
      setDeletingId(null);
    });
  };

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Success/Error feedback */}
      {state?.success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          {t("saved")}
        </div>
      )}
      {state?.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {tAdmin(state.error)}
        </div>
      )}

      {/* Knowledge feedback */}
      {createState?.success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          {t("knowledge.created")}
        </div>
      )}
      {createState?.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t("knowledge.createError")}
        </div>
      )}
      {updateState?.success && (
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          {t("knowledge.updated")}
        </div>
      )}
      {updateState?.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {t("knowledge.updateError")}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="instructions">
        <TabsList>
          <TabsTrigger value="instructions" className="group/tab">
            <Bot className="h-4 w-4" />
            <span className="hidden group-data-[state=active]/tab:inline sm:inline">{t("tabs.instructions")}</span>
          </TabsTrigger>
          <TabsTrigger value="knowledge" className="group/tab">
            <BookOpen className="h-4 w-4" />
            <span className="hidden group-data-[state=active]/tab:inline sm:inline">{t("tabs.knowledge")}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="group/tab">
            <Palette className="h-4 w-4" />
            <span className="hidden group-data-[state=active]/tab:inline sm:inline">{t("tabs.appearance")}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Instructions Tab ── */}
        <TabsContent value="instructions" className="mt-6">
          <form action={formAction}>
            {/* Hidden fields */}
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="model" value={model} />
            <input type="hidden" name="temperature" value={temperature} />
            <input type="hidden" name="maxTokens" value={maxTokens} />
            <input type="hidden" name="promptStructure" value={JSON.stringify(promptStructure)} />
            <input
              type="hidden"
              name="handoffKeywords"
              value={keywords.join(",")}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              {/* ── Left Column: Main content ── */}
              <div className="space-y-6">
                {/* Agent Instructions (structured) */}
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <CardTitle className="text-base">
                          {t("systemPrompt.title")}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {t("systemPrompt.description")}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {(promptStructure.agentName || promptStructure.role || promptStructure.rules.length > 0 || promptStructure.personality) && (
                          <Badge className="bg-cta/15 text-cta hover:bg-cta/20 border-0">
                            {t("systemPrompt.active")}
                          </Badge>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTemplateDialog(true)}
                        >
                          <LayoutTemplate className="mr-1.5 h-4 w-4" />
                          {t("agentInstructions.useTemplate")}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Legacy prompt warning */}
                    {hasLegacyPrompt && (
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        {t("agentInstructions.legacyWarning")}
                      </div>
                    )}

                    {/* Agent Name */}
                    <div className="space-y-2">
                      <Label>{t("agentInstructions.agentName")}</Label>
                      <Input
                        value={promptStructure.agentName}
                        onChange={(e) => setPromptStructure((prev) => ({ ...prev, agentName: e.target.value }))}
                        placeholder={t("agentInstructions.agentNamePlaceholder")}
                        maxLength={100}
                        autoComplete="off"
                        className="bg-background"
                      />
                      <p className="text-[10px] text-muted-foreground/70">
                        {t("agentInstructions.agentNameHint")}
                      </p>
                    </div>

                    <Separator />

                    {/* Agent Role */}
                    <div className="space-y-2">
                      <Label>{t("agentInstructions.role")}</Label>
                      <Textarea
                        value={promptStructure.role}
                        onChange={(e) => setPromptStructure((prev) => ({ ...prev, role: e.target.value }))}
                        placeholder={t("agentInstructions.rolePlaceholder")}
                        rows={3}
                        maxLength={1000}
                        className="resize-none bg-background"
                      />
                      <p className="text-[10px] text-muted-foreground/70">
                        {t("agentInstructions.roleHint")}
                      </p>
                    </div>

                    <Separator />

                    {/* Rules (dynamic list) */}
                    <div className="space-y-3">
                      <Label>{t("agentInstructions.rules")}</Label>
                      {promptStructure.rules.length > 0 && (
                        <div className="space-y-2">
                          {promptStructure.rules.map((rule, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 rounded-lg border bg-background px-3 py-2"
                            >
                              <span className="flex-1 text-sm">{rule}</span>
                              <button
                                type="button"
                                onClick={() => removeRule(index)}
                                className="mt-0.5 shrink-0 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          value={ruleInput}
                          onChange={(e) => setRuleInput(e.target.value)}
                          onKeyDown={handleRuleKeyDown}
                          placeholder={t("agentInstructions.rulePlaceholder")}
                          maxLength={500}
                          disabled={promptStructure.rules.length >= 50}
                          autoComplete="off"
                          className="bg-background"
                        />
                        <Button
                          type="button"
                          onClick={addRule}
                          disabled={!ruleInput.trim() || promptStructure.rules.length >= 50}
                        >
                          {t("agentInstructions.addRule")}
                        </Button>
                      </div>
                      <p className="text-[10px] text-muted-foreground/70">
                        {t("agentInstructions.rulesHint", { count: promptStructure.rules.length })}
                      </p>
                    </div>

                    <Separator />

                    {/* Personality */}
                    <div className="space-y-2">
                      <Label>{t("agentInstructions.personality")}</Label>
                      <Textarea
                        value={promptStructure.personality}
                        onChange={(e) => setPromptStructure((prev) => ({ ...prev, personality: e.target.value }))}
                        placeholder={t("agentInstructions.personalityPlaceholder")}
                        rows={3}
                        maxLength={1000}
                        className="resize-none bg-background"
                      />
                      <p className="text-[10px] text-muted-foreground/70">
                        {t("agentInstructions.personalityHint")}
                      </p>
                    </div>

                    <Separator />

                    {/* Additional Instructions (collapsible disclosure) */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setShowAdditional((v) => !v)}
                        className="flex w-full items-center justify-between gap-2 rounded-md py-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <span className="flex items-center gap-1.5 font-medium">
                          {t("agentInstructions.additionalInstructions")}
                          {!showAdditional && promptStructure.additionalInstructions?.trim() && (
                            <Badge className="ml-1.5 border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
                              {t("agentInstructions.additionalInstructionsHasContent")}
                            </Badge>
                          )}
                        </span>
                        {showAdditional ? (
                          <ChevronUp className="h-4 w-4 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 shrink-0" />
                        )}
                      </button>

                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {t("agentInstructions.additionalInstructionsDescription")}
                      </p>

                      {showAdditional && (
                        <div className="mt-2">
                          <Textarea
                            value={promptStructure.additionalInstructions}
                            onChange={(e) => setPromptStructure((prev) => ({ ...prev, additionalInstructions: e.target.value }))}
                            placeholder={t("agentInstructions.additionalInstructionsPlaceholder")}
                            rows={4}
                            maxLength={2000}
                            className="resize-none bg-background"
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Handoff Keywords */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {t("handoff.title")}
                    </CardTitle>
                    <CardDescription>{t("handoff.description")}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Tags */}
                    {keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {keywords.map((kw) => (
                          <Badge
                            key={kw}
                            variant="secondary"
                            className="gap-1 px-2.5 py-1 text-xs"
                          >
                            {kw}
                            <button
                              type="button"
                              onClick={() => removeKeyword(kw)}
                              className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-foreground/10"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Input */}
                    <div className="flex gap-2">
                      <Input
                        value={keywordInput}
                        onChange={(e) => setKeywordInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t("handoff.placeholder")}
                        maxLength={50}
                        disabled={keywords.length >= 20}
                        autoComplete="off"
                        className="bg-background"
                      />
                      <Button
                        type="button"
                        onClick={addKeyword}
                        disabled={!keywordInput.trim() || keywords.length >= 20}
                      >
                        {t("handoff.addKeyword")}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Custom API Key (super admin only) */}
                {isSuperAdmin && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        {t("apiKey.title")}
                      </CardTitle>
                      <CardDescription>{t("apiKey.description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {aiSettings?.apiKeyHint && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {t("apiKey.currentKey")}:
                          </span>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {aiSettings.apiKeyHint}
                          </Badge>
                        </div>
                      )}
                      <Input
                        name="apiKey"
                        type="password"
                        placeholder={t("apiKey.placeholder")}
                        maxLength={200}
                        autoComplete="new-password"
                        className="bg-background font-mono"
                      />
                      <p className="text-xs text-muted-foreground">
                        {t("apiKey.helpText")}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Action buttons */}
                <div className="flex justify-end gap-3">
                  <Button type="button" variant="outline">
                    {tCommon("cancel")}
                  </Button>
                  <Button type="submit" disabled={isPending}>
                    {isPending ? t("saving") : t("saveChanges")}
                  </Button>
                </div>
              </div>

              {/* ── Right Column: Sidebar ── */}
              <div className="space-y-6">
                {/* AI Preview */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-cta" />
                      <CardTitle className="text-sm">
                        {t("preview.title")}
                      </CardTitle>
                    </div>
                    <CardDescription className="text-xs">
                      {t("preview.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Visitor message — left aligned */}
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-lg bg-muted/60 px-3 py-2 text-xs">
                        {t("preview.question")}
                      </div>
                    </div>
                    {/* AI response — right aligned */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-lg bg-cta/15 px-3 py-2 text-xs text-foreground">
                        {t("preview.answer")}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Technical Settings — super_admin only */}
                {isSuperAdmin && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">
                        {t("quickSettings.title")}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {t("quickSettings.description")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* AI Model */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {t("quickSettings.aiModel")}
                        </Label>
                        <Select value={model} onValueChange={setModel}>
                          <SelectTrigger className="w-full bg-background text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="gpt-4o-mini">
                              gpt-4o-mini
                              <span className="ml-1 text-[10px] text-muted-foreground">{t("quickSettings.modelFast")}</span>
                            </SelectItem>
                            <SelectItem value="gpt-4o">
                              gpt-4o
                              <span className="ml-1 text-[10px] text-muted-foreground">{t("quickSettings.modelBalanced")}</span>
                            </SelectItem>
                            <SelectItem value="gpt-4-turbo">
                              gpt-4-turbo
                              <span className="ml-1 text-[10px] text-muted-foreground">{t("quickSettings.modelPremium")}</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Separator />

                      {/* Temperature */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">
                            {t("quickSettings.temperature")}
                          </Label>
                          <span className="text-xs font-semibold text-cta">
                            {temperature.toFixed(1)}
                          </span>
                        </div>
                        <Slider
                          value={[temperature]}
                          onValueChange={([v]) => setTemperature(v)}
                          min={0}
                          max={2}
                          step={0.1}
                          className="**:data-[slot=slider-range]:bg-cta **:data-[slot=slider-thumb]:border-cta"
                        />
                        <p className="text-[10px] text-muted-foreground/70">
                          {t("quickSettings.temperatureHint")}
                        </p>
                      </div>

                      <Separator />

                      {/* Max Tokens */}
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {t("quickSettings.maxTokens")}
                        </Label>
                        <Input
                          type="number"
                          value={maxTokens}
                          onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (!isNaN(v) && v >= 100 && v <= 4000) setMaxTokens(v);
                          }}
                          min={100}
                          max={4000}
                          step={50}
                          className="bg-background text-xs"
                        />
                        <p className="text-[10px] text-muted-foreground/70">
                          {t("quickSettings.maxTokensHint")}
                        </p>
                      </div>

                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </form>
        </TabsContent>

        {/* ── Knowledge Base Tab ── */}
        <TabsContent value="knowledge" className="mt-6 space-y-4">
          {/* ── Business Hours Card ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-cta" />
                  <CardTitle className="text-base">
                    {t("businessHours.title")}
                  </CardTitle>
                  {existingBH && (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {t("businessHours.configured")}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={existingBH ? "outline" : "default"}
                  onClick={() => {
                    if (existingBH?.structured_data) {
                      setBhData(existingBH.structured_data as unknown as BusinessHoursData);
                    } else {
                      setBhData({ ...DEFAULT_BUSINESS_HOURS });
                    }
                    setShowBHDialog(true);
                  }}
                >
                  {existingBH ? (
                    <>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {t("businessHours.edit")}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t("businessHours.title")}
                    </>
                  )}
                </Button>
              </div>
              <CardDescription className="mt-1">
                {t("businessHours.description")}
              </CardDescription>
            </CardHeader>
            {existingBH && (
              <CardContent className="pt-0">
                <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-line">
                  {existingBH.content}
                </p>
              </CardContent>
            )}
          </Card>

          {/* ── FAQs Card ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-cta" />
                  <CardTitle className="text-base">
                    {t("faqs.title")}
                  </CardTitle>
                  {existingFaqs && (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {t("faqs.configured")}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={existingFaqs ? "outline" : "default"}
                  onClick={() => {
                    if (existingFaqs?.structured_data) {
                      setFaqsData(existingFaqs.structured_data as unknown as FAQsData);
                    } else {
                      setFaqsData({ ...DEFAULT_FAQS });
                    }
                    setShowFaqsDialog(true);
                  }}
                >
                  {existingFaqs ? (
                    <>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {t("faqs.edit")}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t("faqs.title")}
                    </>
                  )}
                </Button>
              </div>
              <CardDescription className="mt-1">
                {t("faqs.description")}
              </CardDescription>
            </CardHeader>
            {existingFaqs && (
              <CardContent className="pt-0">
                <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-line">
                  {existingFaqs.content}
                </p>
              </CardContent>
            )}
          </Card>

          {/* ── Pricing Card ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-cta" />
                  <CardTitle className="text-base">
                    {t("pricing.title")}
                  </CardTitle>
                  {existingPricing && (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {t("pricing.configured")}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={existingPricing ? "outline" : "default"}
                  onClick={() => {
                    if (existingPricing?.structured_data) {
                      setPricingData(existingPricing.structured_data as unknown as PricingData);
                    } else {
                      setPricingData({ ...DEFAULT_PRICING });
                    }
                    setShowPricingDialog(true);
                  }}
                >
                  {existingPricing ? (
                    <>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {t("pricing.edit")}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t("pricing.title")}
                    </>
                  )}
                </Button>
              </div>
              <CardDescription className="mt-1">
                {t("pricing.description")}
              </CardDescription>
            </CardHeader>
            {existingPricing && (
              <CardContent className="pt-0">
                <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-line">
                  {existingPricing.content}
                </p>
              </CardContent>
            )}
          </Card>

          {/* ── Location & Contact Card ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cta" />
                  <CardTitle className="text-base">
                    {t("locationContact.title")}
                  </CardTitle>
                  {existingLocation && (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {t("locationContact.configured")}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={existingLocation ? "outline" : "default"}
                  onClick={() => {
                    if (existingLocation?.structured_data) {
                      setLocationData(existingLocation.structured_data as unknown as LocationContactData);
                    } else {
                      setLocationData({ ...DEFAULT_LOCATION_CONTACT });
                    }
                    setShowLocationDialog(true);
                  }}
                >
                  {existingLocation ? (
                    <>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {t("locationContact.edit")}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t("locationContact.title")}
                    </>
                  )}
                </Button>
              </div>
              <CardDescription className="mt-1">
                {t("locationContact.description")}
              </CardDescription>
            </CardHeader>
            {existingLocation && (
              <CardContent className="pt-0">
                <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-line">
                  {existingLocation.content}
                </p>
              </CardContent>
            )}
          </Card>

          {/* ── Policies Card ── */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-cta" />
                  <CardTitle className="text-base">
                    {t("policies.title")}
                  </CardTitle>
                  {existingPolicies && (
                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                      {t("policies.configured")}
                    </Badge>
                  )}
                </div>
                <Button
                  size="sm"
                  variant={existingPolicies ? "outline" : "default"}
                  onClick={() => {
                    if (existingPolicies?.structured_data) {
                      setPoliciesData(existingPolicies.structured_data as unknown as PoliciesData);
                    } else {
                      setPoliciesData({ ...DEFAULT_POLICIES });
                    }
                    setShowPoliciesDialog(true);
                  }}
                >
                  {existingPolicies ? (
                    <>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      {t("policies.edit")}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1.5 h-3.5 w-3.5" />
                      {t("policies.title")}
                    </>
                  )}
                </Button>
              </div>
              <CardDescription className="mt-1">
                {t("policies.description")}
              </CardDescription>
            </CardHeader>
            {existingPolicies && (
              <CardContent className="pt-0">
                <p className="line-clamp-3 text-xs text-muted-foreground whitespace-pre-line">
                  {existingPolicies.content}
                </p>
              </CardContent>
            )}
          </Card>

          {/* ── Free Text Knowledge ── */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">
                    {t("knowledge.title")}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {t("knowledge.description")}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-3">
                  {freeTextItems.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {t("knowledge.itemCount", { count: freeTextItems.length })}
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setShowAddDialog(true)}
                  >
                    <Plus className="mr-1.5 h-4 w-4" />
                    {t("knowledge.addKnowledge")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {freeTextItems.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="rounded-full bg-muted p-4">
                    <BookOpen className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    {t("knowledge.emptyTitle")}
                  </p>
                  <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground/70">
                    {t("knowledge.emptyDescription")}
                  </p>
                </div>
              ) : (
                /* Knowledge items list */
                <div className="space-y-3">
                  {freeTextItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between gap-4 rounded-lg border bg-background p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 shrink-0 text-cta" />
                          <h4 className="truncate text-sm font-medium">
                            {item.title}
                          </h4>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {item.content}
                        </p>
                        <span className="mt-2 block text-[10px] text-muted-foreground/60">
                          {formatRelativeTime(item.created_at, locale)}
                        </span>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-cta"
                          onClick={() => handleEditKnowledge(item)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteKnowledge(item.id)}
                          disabled={isDeletePending && deletingId === item.id}
                        >
                          {isDeletePending && deletingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Widget Appearance Tab ── */}
        <TabsContent value="appearance" className="mt-6">
          {widgetChannelId ? (
            <AppearanceForm
              channelId={widgetChannelId}
              publicKey={widgetPublicKey || ""}
              initialAppearance={widgetAppearance || {}}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("widgetAppearance.noChannel")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("widgetAppearance.noChannelDescription")}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Add Knowledge Dialog ── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("knowledge.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("knowledge.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form action={createAction}>
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="knowledge-title">
                  {t("knowledge.titleLabel")}
                </Label>
                <Input
                  id="knowledge-title"
                  name="title"
                  value={knowledgeTitle}
                  onChange={(e) => setKnowledgeTitle(e.target.value)}
                  placeholder={t("knowledge.titlePlaceholder")}
                  maxLength={200}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="knowledge-content">
                  {t("knowledge.contentLabel")}
                </Label>
                <Textarea
                  id="knowledge-content"
                  name="content"
                  value={knowledgeContent}
                  onChange={(e) => setKnowledgeContent(e.target.value)}
                  placeholder={t("knowledge.contentPlaceholder")}
                  rows={8}
                  maxLength={4000}
                  required
                  className="resize-none bg-background"
                />
                <p className="text-right text-[10px] text-muted-foreground/60">
                  {t("knowledge.charCount", { count: knowledgeContent.length })}
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isCreating || !knowledgeTitle.trim() || knowledgeContent.length < 10}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t("knowledge.saving")}
                  </>
                ) : (
                  t("knowledge.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Template Selection Dialog ── */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("templates.selectTitle")}</DialogTitle>
            <DialogDescription>{t("templates.selectDescription")}</DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] space-y-3 overflow-y-auto py-2">
            {templates.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("templates.noTemplates")}
              </p>
            ) : (
              templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => {
                    setPromptStructure({ ...tmpl.structure });
                    setShowTemplateDialog(false);
                  }}
                  className="w-full rounded-lg border bg-background p-4 text-left transition-colors hover:border-cta hover:bg-cta/5"
                >
                  <h4 className="text-sm font-medium">{tmpl.name}</h4>
                  {tmpl.description && (
                    <p className="mt-1 text-xs text-muted-foreground">{tmpl.description}</p>
                  )}
                  <p className="mt-1.5 text-[10px] text-muted-foreground/60">
                    {tmpl.structure.agentName && `${tmpl.structure.agentName} · `}
                    {t("templates.rulesCount", { count: tmpl.structure.rules.length })}
                  </p>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Business Hours Dialog ── */}
      <Dialog open={showBHDialog} onOpenChange={setShowBHDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("businessHours.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("businessHours.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form action={bhAction}>
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="knowledgeId" value={existingBH?.id ?? ""} />
            <input type="hidden" name="structuredData" value={JSON.stringify(bhData)} />
            <div className="py-2">
              <BusinessHoursForm
                data={bhData}
                onChange={setBhData}
                locale={locale}
                t={(key, values) => t(`businessHours.${key}`, values as Record<string, string | number | Date> | undefined)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowBHDialog(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isBHSaving}>
                {isBHSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t("businessHours.saving")}
                  </>
                ) : (
                  t("businessHours.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── FAQs Dialog ── */}
      <Dialog open={showFaqsDialog} onOpenChange={setShowFaqsDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("faqs.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("faqs.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form action={faqsAction}>
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="category" value="faqs" />
            <input type="hidden" name="knowledgeId" value={existingFaqs?.id ?? ""} />
            <input type="hidden" name="structuredData" value={JSON.stringify(faqsData)} />
            <div className="py-2">
              <FAQsForm
                data={faqsData}
                onChange={setFaqsData}
                t={(key, values) => t(`faqs.${key}`, values as Record<string, string | number | Date> | undefined)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowFaqsDialog(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isFaqsSaving || faqsData.items.length === 0}>
                {isFaqsSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t("faqs.saving")}
                  </>
                ) : (
                  t("faqs.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Pricing Dialog ── */}
      <Dialog open={showPricingDialog} onOpenChange={setShowPricingDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("pricing.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("pricing.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form action={pricingAction}>
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="category" value="pricing" />
            <input type="hidden" name="knowledgeId" value={existingPricing?.id ?? ""} />
            <input type="hidden" name="structuredData" value={JSON.stringify(pricingData)} />
            <div className="py-2">
              <PricingForm
                data={pricingData}
                onChange={setPricingData}
                t={(key, values) => t(`pricing.${key}`, values as Record<string, string | number | Date> | undefined)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPricingDialog(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPricingSaving || pricingData.items.length === 0}>
                {isPricingSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t("pricing.saving")}
                  </>
                ) : (
                  t("pricing.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Location & Contact Dialog ── */}
      <Dialog open={showLocationDialog} onOpenChange={setShowLocationDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("locationContact.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("locationContact.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form action={locationAction}>
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="category" value="location_contact" />
            <input type="hidden" name="knowledgeId" value={existingLocation?.id ?? ""} />
            <input type="hidden" name="structuredData" value={JSON.stringify(locationData)} />
            <div className="py-2">
              <LocationContactForm
                data={locationData}
                onChange={setLocationData}
                t={(key, values) => t(`locationContact.${key}`, values as Record<string, string | number | Date> | undefined)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowLocationDialog(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isLocationSaving}>
                {isLocationSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t("locationContact.saving")}
                  </>
                ) : (
                  t("locationContact.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Policies Dialog ── */}
      <Dialog open={showPoliciesDialog} onOpenChange={setShowPoliciesDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("policies.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("policies.dialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form action={policiesAction}>
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="category" value="policies" />
            <input type="hidden" name="knowledgeId" value={existingPolicies?.id ?? ""} />
            <input type="hidden" name="structuredData" value={JSON.stringify(policiesData)} />
            <div className="py-2">
              <PoliciesForm
                data={policiesData}
                onChange={setPoliciesData}
                t={(key, values) => t(`policies.${key}`, values as Record<string, string | number | Date> | undefined)}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowPoliciesDialog(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={isPoliciesSaving || policiesData.items.length === 0}>
                {isPoliciesSaving ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t("policies.saving")}
                  </>
                ) : (
                  t("policies.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit Knowledge Dialog ── */}
      <Dialog open={!!editingItem} onOpenChange={(open) => { if (!open) setEditingItem(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("knowledge.editDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("knowledge.editDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <form action={updateAction}>
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="knowledgeId" value={editingItem?.id || ""} />
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="edit-knowledge-title">
                  {t("knowledge.titleLabel")}
                </Label>
                <Input
                  id="edit-knowledge-title"
                  name="title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t("knowledge.titlePlaceholder")}
                  maxLength={200}
                  required
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-knowledge-content">
                  {t("knowledge.contentLabel")}
                </Label>
                <Textarea
                  id="edit-knowledge-content"
                  name="content"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  placeholder={t("knowledge.contentPlaceholder")}
                  rows={8}
                  maxLength={4000}
                  required
                  className="resize-none bg-background"
                />
                <p className="text-right text-[10px] text-muted-foreground/60">
                  {t("knowledge.charCount", { count: editContent.length })}
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditingItem(null)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isUpdating || !editTitle.trim() || editContent.length < 10}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    {t("knowledge.updating")}
                  </>
                ) : (
                  t("knowledge.update")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
