import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { chatHistorySchema, closeConversationSchema } from "@/lib/api/validate";
import { handleOptions, jsonResponse, errorResponse } from "@/lib/api/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = request.nextUrl;

    const parsed = chatHistorySchema.safeParse({
      visitorId: searchParams.get("visitorId"),
    });

    if (!parsed.success) {
      return errorResponse("visitorId is required");
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
    const body = await request.json();

    const parsed = closeConversationSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("visitorId is required");
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id,
        visitorId: parsed.data.visitorId,
      },
      select: { id: true, status: true },
    });

    if (!conversation) {
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
