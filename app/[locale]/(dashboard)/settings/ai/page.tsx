import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { listKnowledge } from "@/lib/rag/knowledge";
import { AiSettingsClient } from "./ai-settings-client";
import type { PromptStructure } from "@/lib/chat/prompt-builder";
import type { KnowledgeCategory } from "@/lib/knowledge/business-hours";
import type { WidgetAppearance, ChannelWidgetConfig } from "@/lib/widget/appearance";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AiSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/en/login");

  let selectedOrgId = "";
  let organizationName = "";

  if (user.isSuperAdmin) {
    const cookieStore = await cookies();
    const rawOrgId = cookieStore.get("selectedOrgId")?.value || "";
    selectedOrgId = UUID_RE.test(rawOrgId) ? rawOrgId : "";

    if (selectedOrgId) {
      const org = await prisma.organization.findUnique({
        where: { id: selectedOrgId },
        select: { name: true },
      });
      organizationName = org?.name || "";
    }
  } else {
    // Regular user: get org from membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      include: { organization: { select: { id: true, name: true } } },
    });
    if (membership) {
      selectedOrgId = membership.organization.id;
      organizationName = membership.organization.name;
    }
  }

  // Fetch AI settings for selected org
  let aiSettings = null;
  if (selectedOrgId) {
    const settings = await prisma.aiSettings.findUnique({
      where: { organizationId: selectedOrgId },
    });
    if (settings) {
      aiSettings = {
        id: settings.id,
        organizationId: settings.organizationId,
        provider: settings.provider,
        model: settings.model,
        systemPrompt: settings.systemPrompt,
        temperature: Number(settings.temperature),
        maxTokens: settings.maxTokens,
        handoffKeywords: settings.handoffKeywords,
        apiKeyHint: settings.apiKeyHint,
        promptStructure: settings.promptStructure as PromptStructure | null,
      };
    }
  }

  // Fetch prompt templates (for template selector)
  const templates = await prisma.promptTemplate.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, structure: true },
  });

  // Fetch knowledge items for this org
  let knowledgeItems: { id: string; title: string; content: string; category: KnowledgeCategory; structured_data: Record<string, unknown> | null; tokens_used: number; created_at: string }[] = [];
  if (selectedOrgId) {
    try {
      knowledgeItems = await listKnowledge(selectedOrgId);
    } catch (e) {
      console.error("[AiSettingsPage] Failed to fetch knowledge:", e);
    }
  }

  // Fetch first active website channel for widget appearance
  let widgetChannelId = "";
  let widgetAppearance: WidgetAppearance = {};
  if (selectedOrgId) {
    const channel = await prisma.channel.findFirst({
      where: { organizationId: selectedOrgId, type: "website", isActive: true },
      select: { id: true, config: true },
    });
    if (channel) {
      widgetChannelId = channel.id;
      const cfg = channel.config as ChannelWidgetConfig | null;
      widgetAppearance = cfg?.widgetAppearance || {};
    }
  }

  return (
    <AiSettingsClient
      selectedOrgId={selectedOrgId}
      organizationName={organizationName}
      aiSettings={aiSettings}
      isSuperAdmin={user.isSuperAdmin}
      knowledgeItems={knowledgeItems}
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        structure: t.structure as unknown as PromptStructure,
      }))}
      widgetChannelId={widgetChannelId}
      widgetAppearance={widgetAppearance}
    />
  );
}
