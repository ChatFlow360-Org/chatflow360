import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { ConversationsClient } from "./conversations-client";
import type { Conversation } from "@/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ConversationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/en/login");

  // Determine which org/channel to filter by
  let orgFilter: string | undefined;
  let channelFilter: string | undefined;

  if (user.isSuperAdmin) {
    const cookieStore = await cookies();
    const rawOrgId = cookieStore.get("selectedOrgId")?.value || "";
    const rawChannelId = cookieStore.get("selectedChannelId")?.value || "";
    orgFilter = UUID_RE.test(rawOrgId) ? rawOrgId : undefined;
    channelFilter = UUID_RE.test(rawChannelId) ? rawChannelId : undefined;
  } else {
    // Regular user: filter by their org membership
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    if (membership) {
      orgFilter = membership.organizationId;
    }
  }

  // Build where clause
  const where: Record<string, unknown> = {};
  if (channelFilter) {
    where.channelId = channelFilter;
  } else if (orgFilter) {
    where.channel = { organizationId: orgFilter };
  }

  // Fetch conversations with latest message and count
  const rawConversations = await prisma.conversation.findMany({
    where,
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      channel: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true },
      },
      _count: { select: { messages: true } },
    },
  });

  // Transform to client-friendly format
  const conversations: Conversation[] = rawConversations.map((conv) => {
    const contactInfo = (conv.contactInfo || {}) as Record<string, string>;
    const visitorName =
      contactInfo.name ||
      (conv.visitorId ? `Visitor ${conv.visitorId.slice(-4)}` : "Visitor");
    const visitorEmail = contactInfo.email || undefined;
    const lastMessage = conv.messages[0]?.content || "";

    return {
      id: conv.id,
      channelId: conv.channelId,
      visitorName,
      visitorEmail,
      status: conv.status as Conversation["status"],
      responderMode: conv.responderMode as Conversation["responderMode"],
      lastMessage,
      lastMessageAt: conv.lastMessageAt.toISOString(),
      messageCount: conv._count.messages,
      createdAt: conv.createdAt.toISOString(),
      channelName: conv.channel.name,
    };
  });

  return <ConversationsClient conversations={conversations} />;
}
