"use client";

import { useState, useActionState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  X,
  Building2,
  Lock,
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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { upsertAiSettings } from "@/lib/admin/actions";
import { DEFAULT_HANDOFF_KEYWORDS } from "@/lib/chat/defaults";

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
}

interface AiSettingsClientProps {
  selectedOrgId: string;
  organizationName: string;
  aiSettings: AiSettingsData | null;
  isSuperAdmin: boolean;
}

// --- Component ---

export function AiSettingsClient({
  selectedOrgId,
  organizationName,
  aiSettings,
  isSuperAdmin,
}: AiSettingsClientProps) {
  const t = useTranslations("settings");
  const tCommon = useTranslations("common");
  const tAdmin = useTranslations("admin.errors");

  const [state, formAction, isPending] = useActionState(
    upsertAiSettings,
    null
  );

  // Form state
  const [model] = useState(aiSettings?.model || "gpt-4o-mini");
  const [temperature] = useState(aiSettings?.temperature ?? 0.7);
  const [maxTokens] = useState(aiSettings?.maxTokens || 500);
  const [systemPrompt, setSystemPrompt] = useState(
    aiSettings?.systemPrompt || ""
  );
  const resolveKeywords = (settings: AiSettingsData | null): string[] => {
    if (!settings) return [...DEFAULT_HANDOFF_KEYWORDS];
    return settings.handoffKeywords.length > 0 ? settings.handoffKeywords : [...DEFAULT_HANDOFF_KEYWORDS];
  };

  const [keywords, setKeywords] = useState<string[]>(resolveKeywords(aiSettings));
  const [keywordInput, setKeywordInput] = useState("");
  const [handoffEnabled, setHandoffEnabled] = useState(true);

  // Reset form when org changes
  useEffect(() => {
    setSystemPrompt(aiSettings?.systemPrompt || "");
    const resolved = resolveKeywords(aiSettings);
    setKeywords(resolved);
    setKeywordInput("");
    setHandoffEnabled(resolved.length > 0);
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

  // --- Model display name ---
  const modelDisplay =
    model === "gpt-4o-mini"
      ? "gpt-4o-mini"
      : model === "gpt-4o"
        ? "gpt-4o"
        : "gpt-4-turbo";

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

      {/* Tabs */}
      <Tabs defaultValue="instructions">
        <TabsList>
          <TabsTrigger value="instructions">{t("tabs.instructions")}</TabsTrigger>
          <TabsTrigger value="knowledge">{t("tabs.knowledge")}</TabsTrigger>
        </TabsList>

        {/* ── Instructions Tab ── */}
        <TabsContent value="instructions" className="mt-6">
          <form action={formAction}>
            {/* Hidden fields */}
            <input type="hidden" name="organizationId" value={selectedOrgId} />
            <input type="hidden" name="model" value={model} />
            <input type="hidden" name="temperature" value={temperature} />
            <input type="hidden" name="maxTokens" value={maxTokens} />
            <input type="hidden" name="systemPrompt" value={systemPrompt} />
            <input
              type="hidden"
              name="handoffKeywords"
              value={keywords.join(",")}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
              {/* ── Left Column: Main content ── */}
              <div className="space-y-6">
                {/* System Prompt */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          {t("systemPrompt.title")}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {t("systemPrompt.description")}
                        </CardDescription>
                      </div>
                      {systemPrompt && (
                        <Badge className="bg-cta/15 text-cta hover:bg-cta/20 border-0">
                          {t("systemPrompt.active")}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      placeholder={t("systemPrompt.placeholder")}
                      rows={6}
                      maxLength={4000}
                      className="resize-none bg-background"
                    />
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

                {/* Quick Settings */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        {t("quickSettings.title")}
                      </CardTitle>
                      {!isSuperAdmin && (
                        <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />
                      )}
                    </div>
                    {!isSuperAdmin && (
                      <CardDescription className="text-[10px]">
                        {t("quickSettings.readOnly")}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-0">
                    {/* AI Model */}
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-muted-foreground">
                        {t("quickSettings.aiModel")}
                      </span>
                      <span className="text-xs font-medium">
                        {modelDisplay}
                      </span>
                    </div>
                    <Separator />

                    {/* Temperature */}
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-muted-foreground">
                        {t("quickSettings.temperature")}
                      </span>
                      <span className="text-xs font-medium text-cta">
                        {temperature.toFixed(1)}
                      </span>
                    </div>
                    <Separator />

                    {/* Max Tokens */}
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-muted-foreground">
                        {t("quickSettings.maxTokens")}
                      </span>
                      <span className="text-xs font-medium">{maxTokens}</span>
                    </div>
                    <Separator />

                    {/* Human Takeover */}
                    <div className="flex items-center justify-between py-2.5">
                      <span className="text-xs text-muted-foreground">
                        {t("quickSettings.humanTakeover")}
                      </span>
                      <Switch
                        checked={handoffEnabled}
                        onCheckedChange={setHandoffEnabled}
                        disabled={!isSuperAdmin}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* ── Knowledge Base Tab ── */}
        <TabsContent value="knowledge" className="mt-6">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <p className="text-sm font-medium text-muted-foreground">
                {t("knowledge.comingSoon")}
              </p>
              <p className="mt-1 max-w-sm text-center text-xs text-muted-foreground/70">
                {t("knowledge.comingSoonDescription")}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
