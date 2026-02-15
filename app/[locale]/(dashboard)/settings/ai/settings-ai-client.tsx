"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useTranslations } from "next-intl";
import { Plus, Trash2, X, Eye } from "lucide-react";
import { mockAiSettings, mockKnowledge } from "@/lib/mock/data";
import type { KnowledgeItem } from "@/types";

export function SettingsAiClient() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");
  const [systemPrompt, setSystemPrompt] = useState(mockAiSettings.systemPrompt || "");
  const [temperature, setTemperature] = useState(mockAiSettings.temperature);
  const [maxTokens, setMaxTokens] = useState(mockAiSettings.maxTokens);
  const [handoffKeywords, setHandoffKeywords] = useState<string[]>(mockAiSettings.handoffKeywords);
  const [newKeyword, setNewKeyword] = useState("");
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>(mockKnowledge);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [humanTakeover, setHumanTakeover] = useState(true);

  const addKeyword = () => {
    if (newKeyword.trim() && !handoffKeywords.includes(newKeyword.trim())) {
      setHandoffKeywords([...handoffKeywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    setHandoffKeywords(handoffKeywords.filter((k) => k !== kw));
  };

  const addKnowledge = () => {
    if (newTitle.trim() && newContent.trim()) {
      const item: KnowledgeItem = {
        id: `kb-${Date.now()}`,
        channelId: "ch-1",
        title: newTitle,
        content: newContent,
        createdAt: new Date().toISOString(),
      };
      setKnowledge([...knowledge, item]);
      setNewTitle("");
      setNewContent("");
      setDialogOpen(false);
    }
  };

  const removeKnowledge = (id: string) => {
    setKnowledge(knowledge.filter((k) => k.id !== id));
  };

  return (
    <Tabs defaultValue="instructions" className="space-y-4">
      <TabsList className="bg-muted">
        <TabsTrigger value="instructions">{t("tabs.instructions")}</TabsTrigger>
        <TabsTrigger value="knowledge">{t("tabs.knowledge")}</TabsTrigger>
      </TabsList>

      {/* Instructions Tab */}
      <TabsContent value="instructions">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left Column - Config */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{t("systemPrompt.title")}</CardTitle>
                    <CardDescription>{t("systemPrompt.description")}</CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {t("systemPrompt.active")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={8}
                  className="resize-none text-sm"
                  placeholder={t("systemPrompt.placeholder")}
                />
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="text-base">{t("handoff.title")}</CardTitle>
                <CardDescription>{t("handoff.description")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {handoffKeywords.map((kw) => (
                    <Badge
                      key={kw}
                      variant="outline"
                      className="gap-1 pr-1 text-xs"
                    >
                      {kw}
                      <button
                        onClick={() => removeKeyword(kw)}
                        className="ml-1 rounded-full p-0.5 hover:bg-muted"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    placeholder={t("handoff.placeholder")}
                    className="text-sm"
                    onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                  />
                  <Button variant="outline" size="sm" onClick={addKeyword}>
                    {tc("add")}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline">{tc("cancel")}</Button>
              <Button className="bg-cta text-cta-foreground hover:bg-cta/90">
                {t("saveChanges")}
              </Button>
            </div>
          </div>

          {/* Right Column - Preview + Quick Settings */}
          <div className="space-y-4">
            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary-brand-light" />
                  <CardTitle className="text-sm">{t("preview.title")}</CardTitle>
                </div>
                <CardDescription className="text-xs">
                  {t("preview.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-xl rounded-bl-md bg-accent px-3.5 py-2.5">
                      <p className="text-xs text-foreground">{t("preview.question")}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-xl rounded-br-md bg-cta/10 px-3.5 py-2.5">
                      <p className="text-xs text-foreground">
                        {t("preview.answer")}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">{t("quickSettings.title")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-muted-foreground">{t("quickSettings.aiModel")}</span>
                  <span className="rounded-md bg-muted px-3 py-1 text-xs text-foreground">
                    {mockAiSettings.model}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-muted-foreground">{t("quickSettings.temperature")}</span>
                  <span className="text-xs font-medium text-primary-brand-light">{temperature}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-muted-foreground">{t("quickSettings.maxTokens")}</span>
                  <span className="text-xs font-medium text-foreground">{maxTokens}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] text-muted-foreground">{t("quickSettings.humanTakeover")}</span>
                  <Switch
                    checked={humanTakeover}
                    onCheckedChange={setHumanTakeover}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      {/* Knowledge Base Tab */}
      <TabsContent value="knowledge" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t("knowledge.title")}</h3>
            <p className="text-xs text-muted-foreground">
              {t("knowledge.description")}
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-cta text-cta-foreground hover:bg-cta/90">
                <Plus className="mr-1 h-4 w-4" />
                {t("knowledge.addKnowledge")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t("knowledge.dialogTitle")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>{t("knowledge.titleLabel")}</Label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={t("knowledge.titlePlaceholder")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("knowledge.contentLabel")}</Label>
                  <Textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={5}
                    placeholder={t("knowledge.contentPlaceholder")}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    {tc("cancel")}
                  </Button>
                  <Button
                    className="bg-cta text-cta-foreground hover:bg-cta/90"
                    onClick={addKnowledge}
                  >
                    {tc("add")}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {knowledge.map((item) => (
            <Card key={item.id} className="border-border border-l-[3px] border-l-cta bg-card">
              <CardContent className="flex items-start gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {item.content}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeKnowledge(item.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
