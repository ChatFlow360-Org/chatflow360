import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { AiSettingsClient } from "./ai-settings-client";

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
      };
    }
  }

  return (
    <AiSettingsClient
      selectedOrgId={selectedOrgId}
      organizationName={organizationName}
      aiSettings={aiSettings}
      isSuperAdmin={user.isSuperAdmin}
    />
  );
}
