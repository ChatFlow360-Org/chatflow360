"use server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/user";
import { cookies } from "next/headers";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DashboardData {
  stats: {
    totalConversations: number;
    activeNow: number;
    avgResponseTimeSec: number;
    aiHandledPercent: number;
    newVisitors: number;
  };
  recentConversations: {
    id: string;
    visitorId: string | null;
    status: string;
    lastMessageAt: Date;
    lastMessage: string | null;
    channelName: string;
  }[];
  topPages: { page: string; count: number }[];
  aiPerformance: {
    aiHandled: number;
    humanEscalated: number;
    totalConversations: number;
  };
}

interface FetchDashboardParams {
  from?: string; // ISO date string
  to?: string;   // ISO date string
}

async function getOrgFilter(user: { isSuperAdmin: boolean; memberships?: { organizationId: string }[] }) {
  if (user.isSuperAdmin) {
    const cookieStore = await cookies();
    const rawOrgId = cookieStore.get("selectedOrgId")?.value || "";
    return UUID_RE.test(rawOrgId) ? rawOrgId : undefined;
  }
  return user.memberships?.[0]?.organizationId;
}

export async function fetchDashboardData(params: FetchDashboardParams = {}): Promise<DashboardData | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const orgId = await getOrgFilter(user);

  // Date range filter
  const now = new Date();
  const from = params.from ? new Date(params.from) : new Date(now.getTime() - 30 * 86400000);
  const to = params.to ? new Date(params.to) : now;
  // Ensure 'to' covers end of day
  to.setHours(23, 59, 59, 999);

  const dateFilter = { gte: from, lte: to };
  const orgWhere = orgId ? { organizationId: orgId } : {};

  // --- Stats: run queries in parallel ---
  const [
    totalConversations,
    activeNow,
    aiConversations,
    uniqueVisitors,
    recentConvs,
    avgResponseTime,
  ] = await Promise.all([
    // Total conversations in date range
    prisma.conversation.count({
      where: { ...orgWhere, createdAt: dateFilter },
    }),

    // Active now (open or pending)
    prisma.conversation.count({
      where: { ...orgWhere, status: { in: ["open", "pending"] } },
    }),

    // AI-handled conversations (never switched to human)
    prisma.conversation.count({
      where: { ...orgWhere, createdAt: dateFilter, responderMode: "ai" },
    }),

    // Unique visitors in date range
    prisma.conversation.groupBy({
      by: ["visitorId"],
      where: { ...orgWhere, createdAt: dateFilter, visitorId: { not: null } },
    }),

    // Recent 5 conversations with last message
    prisma.conversation.findMany({
      where: orgWhere,
      orderBy: { lastMessageAt: "desc" },
      take: 5,
      select: {
        id: true,
        visitorId: true,
        status: true,
        lastMessageAt: true,
        channel: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { content: true },
        },
      },
    }),

    // Average first response time (time between first visitor message and first AI/agent response)
    prisma.$queryRawUnsafe<{ avg_seconds: number | null }[]>(`
      SELECT AVG(response_seconds) as avg_seconds FROM (
        SELECT
          m1.conversation_id,
          EXTRACT(EPOCH FROM (MIN(m2.created_at) - MIN(m1.created_at))) as response_seconds
        FROM messages m1
        JOIN messages m2 ON m1.conversation_id = m2.conversation_id AND m2.sender_type IN ('ai', 'agent')
        JOIN conversations c ON c.id = m1.conversation_id
        WHERE m1.sender_type = 'visitor'
          AND m1.created_at >= $1
          AND m1.created_at <= $2
          ${orgId ? `AND c.organization_id = $3::uuid` : ""}
        GROUP BY m1.conversation_id
      ) sub
      WHERE response_seconds > 0 AND response_seconds < 3600
    `, from, to, ...(orgId ? [orgId] : [])),
  ]);

  // --- Top Pages (from conversation metadata.pageUrl) ---
  const pageConversations = await prisma.conversation.findMany({
    where: { ...orgWhere, createdAt: dateFilter },
    select: { metadata: true },
  });

  const pageCounts: Record<string, number> = {};
  for (const conv of pageConversations) {
    const meta = conv.metadata as Record<string, unknown> | null;
    const pageUrl = meta?.pageUrl;
    if (typeof pageUrl === "string") {
      try {
        const url = new URL(pageUrl);
        const path = url.pathname;
        pageCounts[path] = (pageCounts[path] || 0) + 1;
      } catch {
        pageCounts[pageUrl] = (pageCounts[pageUrl] || 0) + 1;
      }
    }
  }

  const topPages = Object.entries(pageCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([page, count]) => ({ page, count }));

  // --- Build response ---
  const aiHandledPercent = totalConversations > 0
    ? Math.round((aiConversations / totalConversations) * 100)
    : 0;

  const avgSec = avgResponseTime[0]?.avg_seconds ?? 0;

  return {
    stats: {
      totalConversations,
      activeNow,
      avgResponseTimeSec: Math.round(avgSec),
      aiHandledPercent,
      newVisitors: uniqueVisitors.length,
    },
    recentConversations: recentConvs.map((c) => ({
      id: c.id,
      visitorId: c.visitorId,
      status: c.status,
      lastMessageAt: c.lastMessageAt,
      lastMessage: c.messages[0]?.content ?? null,
      channelName: c.channel.name,
    })),
    topPages,
    aiPerformance: {
      aiHandled: aiConversations,
      humanEscalated: totalConversations - aiConversations,
      totalConversations,
    },
  };
}
