import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { listKnowledge } from "@/lib/rag/knowledge";
import { AiSettingsClient } from "./ai-settings-client";
import type { PromptStructure } from "@/lib/chat/prompt-builder";
import type { KnowledgeCategory } from "@/lib/knowledge/business-hours";
import type { WidgetAppearance, ChannelWidgetConfig } from "@/lib/widget/appearance";
import type { PostChatSettings, ChannelPostChatConfig } from "@/lib/widget/post-chat";
import type { PieceType } from "@/lib/prompt-pieces";

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

  // Fetch prompt pieces for org's business category
  let promptPieces: { id: string; type: PieceType; name: string; content: string }[] = [];
  let businessCategoryName = "";
  if (selectedOrgId) {
    const org = await prisma.organization.findUnique({
      where: { id: selectedOrgId },
      select: { businessCategoryId: true, businessCategory: { select: { name: true } } },
    });
    if (org?.businessCategory) {
      businessCategoryName = org.businessCategory.name;
    }
    if (org?.businessCategoryId) {
      const pieces = await prisma.promptPiece.findMany({
        where: { categoryId: org.businessCategoryId },
        orderBy: { sortOrder: "asc" },
        select: { id: true, type: true, name: true, content: true },
      });
      promptPieces = pieces.map((p) => ({
        id: p.id,
        type: p.type as PieceType,
        name: p.name,
        content: p.content,
      }));
    }
  }

  // Fetch global mandatory rules (not tied to any category)
  let globalRules: { id: string; name: string; content: string }[] = [];
  const rawGlobalRules = await prisma.promptPiece.findMany({
    where: { categoryId: { equals: null } as never, type: "rule" },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, content: true },
  });
  globalRules = rawGlobalRules;

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
  let widgetPublicKey = "";
  let channelWebsiteUrl = "";
  let widgetAppearance: WidgetAppearance = {};
  let postChatSettings: PostChatSettings = {};
  if (selectedOrgId) {
    const channel = await prisma.channel.findFirst({
      where: { organizationId: selectedOrgId, type: "website", isActive: true },
      select: { id: true, name: true, publicKey: true, config: true },
    });
    if (channel) {
      widgetChannelId = channel.id;
      widgetPublicKey = channel.publicKey ?? "";
      channelWebsiteUrl = channel.name;
      const cfg = channel.config as (ChannelWidgetConfig & ChannelPostChatConfig) | null;
      widgetAppearance = cfg?.widgetAppearance || {};
      postChatSettings = cfg?.postChatSettings || {};
    }
  }

  return (
    <AiSettingsClient
      selectedOrgId={selectedOrgId}
      organizationName={organizationName}
      aiSettings={aiSettings}
      isSuperAdmin={user.isSuperAdmin}
      knowledgeItems={knowledgeItems}
      promptPieces={promptPieces}
      businessCategoryName={businessCategoryName}
      globalRules={globalRules}
      widgetChannelId={widgetChannelId}
      widgetPublicKey={widgetPublicKey}
      channelWebsiteUrl={channelWebsiteUrl}
      widgetAppearance={widgetAppearance}
      postChatSettings={postChatSettings}
    />
  );
}
