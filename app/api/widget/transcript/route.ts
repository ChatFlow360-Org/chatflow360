import { prisma } from "@/lib/db/prisma";
import { transcriptSchema } from "@/lib/api/validate";
import { handleOptions, jsonResponse, errorResponse } from "@/lib/api/cors";
import { resolvePostChat } from "@/lib/widget/post-chat";
import { renderTranscriptEmail } from "@/lib/email/transcript";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: Request) {
  try {
    // Body size limit (4KB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 4096) {
      return errorResponse("Request body too large", 413);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const parsed = transcriptSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid request", 400);
    }

    const { conversationId, visitorId, email, name, lang } = parsed.data;

    // Fetch conversation with messages + channel config + org name
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, visitorId },
      select: {
        id: true,
        messages: {
          orderBy: { createdAt: "asc" },
          select: {
            senderType: true,
            content: true,
            createdAt: true,
          },
        },
        channel: {
          select: {
            config: true,
            organization: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!conversation) {
      return errorResponse("Conversation not found", 404);
    }

    if (conversation.messages.length === 0) {
      return errorResponse("No messages to send", 400);
    }

    const orgName = conversation.channel.organization.name;
    const settings = resolvePostChat(
      conversation.channel.config as Record<string, unknown> | null,
    );

    if (!settings.enableTranscript) {
      return errorResponse("Transcript email is disabled", 403);
    }

    // Render email
    const { subject, html } = renderTranscriptEmail({
      settings,
      messages: conversation.messages.map((m) => ({
        senderType: m.senderType,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      })),
      visitorName: name,
      orgName,
      lang,
    });

    // Build recipients
    const to = [email];
    const cc = settings.ccEmail ? [settings.ccEmail] : undefined;

    // Send via Resend
    const { error } = await resend.emails.send({
      from: `${orgName} <noreply@chatflow360.com>`,
      to,
      cc,
      subject,
      html,
    });

    if (error) {
      console.error("[POST /api/widget/transcript] Resend error:", error);
      return errorResponse("Failed to send email", 500);
    }

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(
      "[POST /api/widget/transcript]",
      error instanceof Error ? error.message : error,
    );
    return errorResponse("Internal server error", 500);
  }
}
