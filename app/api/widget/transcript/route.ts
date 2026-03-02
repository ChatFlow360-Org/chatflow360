import { prisma } from "@/lib/db/prisma";
import { transcriptSchema } from "@/lib/api/validate";
import { handleOptions, jsonResponse, errorResponse } from "@/lib/api/cors";
import { resolvePostChat } from "@/lib/widget/post-chat";
import { renderTranscriptEmail } from "@/lib/email/transcript";
import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export async function OPTIONS() {
  return handleOptions();
}

export async function POST(request: Request) {
  try {
    // Body size limit (4KB) — read raw text to prevent Content-Length spoofing
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      return errorResponse("Failed to read body", 400);
    }
    if (rawBody.length > 4096) {
      return errorResponse("Request body too large", 413);
    }
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return errorResponse("Invalid JSON", 400);
    }

    const parsed = transcriptSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid request", 400);
    }

    const { conversationId, visitorId, email, name, phone, lang, timezone } = parsed.data;

    // Capture visitor IP for lead record
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || request.headers.get("x-real-ip")
      || null;

    // Fetch conversation with messages + channel config + org name
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, visitorId },
      select: {
        id: true,
        metadata: true,
        contactInfo: true,
        channelId: true,
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
            id: true,
            config: true,
            organization: {
              select: {
                id: true,
                name: true,
                aiSettings: { select: { promptStructure: true } },
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return errorResponse("Conversation not found", 404);
    }

    const pageUrl = (conversation.metadata as Record<string, unknown>)?.pageUrl as string || null;

    if (conversation.messages.length === 0) {
      return errorResponse("No messages to send", 400);
    }

    // CRIT-02: Prevent duplicate transcript emails
    if ((conversation.metadata as any)?.transcriptSent) {
      return errorResponse("Transcript already sent", 429);
    }

    const orgName = conversation.channel.organization.name;
    const promptStructure = conversation.channel.organization.aiSettings?.promptStructure as Record<string, unknown> | null;
    const aiAgentName = (promptStructure?.agentName as string) || null;
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
      aiAgentName,
      lang,
      timezone,
    });

    // Build recipients
    const to = [email];
    const cc = settings.ccEmail ? [settings.ccEmail] : undefined;

    // HIGH-03: Sanitize orgName for email sender field
    const safeOrgName = orgName.replace(/[\r\n\t<>]/g, "").slice(0, 50);

    // Send via Resend
    const { error } = await getResend().emails.send({
      from: `${safeOrgName} <noreply@chatflow360.com>`,
      to,
      cc,
      subject,
      html,
    });

    if (error) {
      console.error("[POST /api/widget/transcript] Resend error:", error);
      return errorResponse("Failed to send email", 500);
    }

    // CRIT-02: Mark transcript as sent to prevent re-sends
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { metadata: { ...(conversation.metadata as any), transcriptSent: true } },
    });

    // Create Lead record
    await prisma.lead.create({
      data: {
        organizationId: conversation.channel.organization.id,
        channelId: conversation.channelId,
        conversationId,
        name,
        email,
        phone: phone || null,
        ip,
        pageUrl,
      },
    });

    // Update conversation contactInfo with lead details
    const existingContact = (conversation.contactInfo || {}) as Record<string, unknown>;
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        contactInfo: {
          ...existingContact,
          name,
          email,
          ...(phone ? { phone } : {}),
        },
      },
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error(
      "[POST /api/widget/transcript]",
      error instanceof Error ? error.message : error,
    );
    return errorResponse("Internal server error", 500);
  }
}
