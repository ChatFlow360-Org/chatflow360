import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatMessageSchema } from "@/lib/api/validate";
import { handleOptions, jsonResponse, errorResponse } from "@/lib/api/cors";
import { resolveChannelConfig } from "@/lib/chat/config";
import { detectHandoff, getHandoffMessage } from "@/lib/chat/handoff";
import { generateAiResponse } from "@/lib/chat/ai";
import { createOpenAIClient } from "@/lib/openai/client";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = chatMessageSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "Invalid request: " + parsed.error.issues[0]?.message
      );
    }

    const { publicKey, visitorId, message, conversationId } = parsed.data;

    // 1. Find channel + org + aiSettings
    const channel = await prisma.channel.findUnique({
      where: { publicKey },
      include: {
        organization: {
          include: { aiSettings: true },
        },
      },
    });

    if (!channel) {
      return errorResponse("Channel not found", 404);
    }

    if (!channel.isActive || !channel.organization.isActive) {
      return errorResponse("Channel is not active", 403);
    }

    const org = channel.organization;
    const aiSettings = org.aiSettings;
    const config = resolveChannelConfig(channel, aiSettings);

    // 2. Create or recover conversation
    let conversation;
    let isNewConversation = false;

    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          channelId: channel.id,
          visitorId,
        },
      });

      if (!conversation) {
        return errorResponse("Conversation not found", 404);
      }
    } else {
      // Create new conversation
      conversation = await prisma.conversation.create({
        data: {
          channelId: channel.id,
          visitorId,
          status: "open",
          responderMode: "ai",
          contactInfo: {},
          metadata: {},
        },
      });
      isNewConversation = true;
    }

    // 3. Save visitor message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "visitor",
        content: message,
        contentType: "text",
      },
    });

    // Update lastMessageAt
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { lastMessageAt: new Date() },
    });

    // 4. Check handoff
    const handoffTriggered = detectHandoff(
      message,
      config.handoffKeywords,
      config.handoffEnabled
    );

    if (handoffTriggered) {
      // Switch to human mode
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { responderMode: "human", status: "pending" },
      });

      // Save handoff message
      const lang = channel.organization.defaultLanguage || "en";
      const handoffMsg = getHandoffMessage(lang);

      const aiMessage = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderType: "ai",
          content: handoffMsg,
          contentType: "text",
        },
      });

      return jsonResponse({
        conversationId: conversation.id,
        message: {
          id: aiMessage.id,
          content: aiMessage.content,
          senderType: "ai",
          createdAt: aiMessage.createdAt.toISOString(),
        },
        handoffTriggered: true,
      });
    }

    // 5. If responder is human (already transferred), don't generate AI
    if (conversation.responderMode === "human") {
      return jsonResponse({
        conversationId: conversation.id,
        message: null,
        awaitingAgent: true,
        handoffTriggered: false,
      });
    }

    // 6. Generate AI response
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      select: { senderType: true, content: true },
    });

    const client = await createOpenAIClient(org.id);
    const aiResult = await generateAiResponse(client, config, history, message);

    // 7. Save AI message
    const aiMessage = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderType: "ai",
        content: aiResult.content,
        contentType: "text",
        tokensUsed: aiResult.tokensUsed,
      },
    });

    // 8. Update UsageTracking
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    await prisma.usageTracking.upsert({
      where: {
        organizationId_month: {
          organizationId: org.id,
          month: monthKey,
        },
      },
      update: {
        totalTokensUsed: { increment: aiResult.tokensUsed },
        ...(isNewConversation ? { conversationCount: { increment: 1 } } : {}),
      },
      create: {
        organizationId: org.id,
        month: monthKey,
        conversationCount: isNewConversation ? 1 : 0,
        totalTokensUsed: aiResult.tokensUsed,
      },
    });

    return jsonResponse({
      conversationId: conversation.id,
      message: {
        id: aiMessage.id,
        content: aiMessage.content,
        senderType: "ai",
        createdAt: aiMessage.createdAt.toISOString(),
      },
      handoffTriggered: false,
    });
  } catch (error) {
    console.error(
      "[POST /api/chat]",
      error instanceof Error ? error.message : error
    );
    return errorResponse("Internal server error", 500);
  }
}
