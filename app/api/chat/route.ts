import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatMessageSchema } from "@/lib/api/validate";
import { handleOptions, jsonResponse, errorResponse } from "@/lib/api/cors";
import { resolveChannelConfig } from "@/lib/chat/config";
import { detectHandoff, getHandoffMessage } from "@/lib/chat/handoff";
import { generateAiResponse, type RagContext } from "@/lib/chat/ai";
import { createOpenAIClient } from "@/lib/openai/client";
import { generateEmbedding } from "@/lib/rag/embedding";
import { searchKnowledge } from "@/lib/rag/search";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: NextRequest) {
  try {
    // FIX-5: Body size limit before parsing (16KB for POST)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 16384) {
      return errorResponse("Request body too large", 413);
    }

    // FIX-6: Safe JSON parsing
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const parsed = chatMessageSchema.safeParse(body);

    if (!parsed.success) {
      // FIX-7: Log detailed error server-side, return generic message to client
      console.warn("[POST /api/chat] validation:", parsed.error.issues);
      return errorResponse("Invalid request");
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

    // 6. RAG: search knowledge base for relevant context
    const client = await createOpenAIClient(org.id);
    let ragContext: RagContext[] = [];

    try {
      const { embedding } = await generateEmbedding(client, message);
      ragContext = await searchKnowledge(org.id, embedding);
    } catch (ragError) {
      // RAG failure is non-blocking — chat continues without context
      console.error("[POST /api/chat] RAG search failed:",
        ragError instanceof Error ? ragError.message : ragError);
    }

    // 7. Generate AI response (with RAG context)
    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      select: { senderType: true, content: true },
    });

    const aiResult = await generateAiResponse(client, config, history, message, ragContext);

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

    // 7b. AI-driven handoff — if AI included [HANDOFF] tag, switch to human mode
    if (aiResult.handoffRequested) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { responderMode: "human", status: "pending" },
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
