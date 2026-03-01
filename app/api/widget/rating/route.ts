import { prisma } from "@/lib/db/prisma";
import { ratingSchema } from "@/lib/api/validate";
import { handleOptions, jsonResponse, errorResponse } from "@/lib/api/cors";

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: Request) {
  try {
    // Body size limit (1KB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 1024) {
      return errorResponse("Request body too large", 413);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const parsed = ratingSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid request", 400);
    }

    const { conversationId, visitorId, rating } = parsed.data;

    // Verify conversation belongs to this visitor
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, visitorId },
      select: { id: true, status: true },
    });

    if (!conversation) {
      return errorResponse("Conversation not found", 404);
    }

    // Save rating
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { rating },
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(
      "[POST /api/widget/rating]",
      error instanceof Error ? error.message : error,
    );
    return errorResponse("Internal server error", 500);
  }
}
