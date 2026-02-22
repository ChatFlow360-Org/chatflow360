import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatHistorySchema, closeConversationSchema } from "@/lib/api/validate";
import { handleOptions, jsonResponse, errorResponse } from "@/lib/api/cors";

// FIX-2: UUID format validation for path params
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // FIX-2: Validate conversationId format
    if (!UUID_REGEX.test(id)) {
      return errorResponse("Invalid conversation ID", 400);
    }

    const { searchParams } = request.nextUrl;

    const parsed = chatHistorySchema.safeParse({
      visitorId: searchParams.get("visitorId"),
    });

    if (!parsed.success) {
      return errorResponse("Invalid request");
    }

    // Verify conversation exists and belongs to this visitor
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        visitorId: parsed.data.visitorId,
      },
      select: {
        id: true,
        status: true,
        responderMode: true,
        createdAt: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            senderType: true,
            content: true,
            createdAt: true,
          },
        },
      },
    });

    if (!conversation) {
      return errorResponse("Conversation not found", 404);
    }

    return jsonResponse({
      id: conversation.id,
      status: conversation.status,
      responderMode: conversation.responderMode,
      createdAt: conversation.createdAt.toISOString(),
      messages: conversation.messages.map((m) => ({
        id: m.id,
        senderType: m.senderType,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error(
      "[GET /api/chat/[id]]",
      error instanceof Error ? error.message : error
    );
    return errorResponse("Internal server error", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // FIX-2: Validate conversationId format
    if (!UUID_REGEX.test(id)) {
      return errorResponse("Invalid conversation ID", 400);
    }

    // FIX-5: Body size limit before parsing (1KB for PATCH)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1024) {
      return errorResponse("Request body too large", 413);
    }

    // FIX-6: Safe JSON parsing
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const parsed = closeConversationSchema.safeParse(body);
    if (!parsed.success) {
      console.warn("[PATCH /api/chat/[id]] validation:", parsed.error.issues);
      return errorResponse("Invalid request");
    }

    // FIX-8: Validate channel and org are active
    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        visitorId: parsed.data.visitorId,
      },
      select: {
        id: true,
        status: true,
        channel: {
          select: {
            isActive: true,
            organization: {
              select: { isActive: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return errorResponse("Conversation not found", 404);
    }

    // FIX-8: Reject if channel or org is inactive
    if (!conversation.channel.isActive || !conversation.channel.organization.isActive) {
      return errorResponse("Conversation not found", 404);
    }

    if (conversation.status === "closed") {
      return jsonResponse({ id, status: "closed" });
    }

    await prisma.conversation.update({
      where: { id },
      data: { status: "closed" },
    });

    return jsonResponse({ id, status: "closed" });
  } catch (error) {
    console.error(
      "[PATCH /api/chat/[id]]",
      error instanceof Error ? error.message : error
    );
    return errorResponse("Internal server error", 500);
  }
}
