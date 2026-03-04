import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleOptions, jsonResponse, errorResponse } from "@/lib/api/cors";
import { resolveAppearance } from "@/lib/widget/appearance";
import { resolvePostChat } from "@/lib/widget/post-chat";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");
    if (!key) return errorResponse("Missing key parameter", 400);

    const channel = await prisma.channel.findUnique({
      where: { publicKey: key },
      select: {
        config: true,
        isActive: true,
        organization: { select: { name: true } },
      },
    });

    if (!channel || !channel.isActive) {
      return errorResponse("Channel not found", 404);
    }

    const configObj = channel.config as Record<string, unknown> | null;
    const appearance = resolveAppearance(configObj);
    const postChatFull = resolvePostChat(configObj);

    // Replace {{org_name}} in teaser texts server-side
    const orgName = channel.organization?.name || "";
    if (orgName) {
      const replaceOrgName = (s: string) => s.replace(/\{\{org_name\}\}/g, orgName);
      if (appearance.teaserTextEn) appearance.teaserTextEn = replaceOrgName(appearance.teaserTextEn);
      if (appearance.teaserTextEs) appearance.teaserTextEs = replaceOrgName(appearance.teaserTextEs);
    }

    // Only expose what the widget needs (no email template details)
    const postChat = {
      enableRating: postChatFull.enableRating,
      enableTranscript: postChatFull.enableTranscript,
      logoUrl: postChatFull.logoUrl || "",
    };

    return jsonResponse({ appearance, postChat, orgName });
  } catch (e) {
    console.error(
      "[widget/config]",
      e instanceof Error ? e.message : e,
    );
    return errorResponse("Internal server error", 500);
  }
}
