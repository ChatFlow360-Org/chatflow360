import { NextRequest } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { handleOptions, jsonResponse, errorResponse } from "@/lib/api/cors";
import { resolveAppearance } from "@/lib/widget/appearance";

export async function OPTIONS() {
  return handleOptions();
}

export async function GET(request: NextRequest) {
  try {
    const key = request.nextUrl.searchParams.get("key");
    if (!key) return errorResponse("Missing key parameter", 400);

    const channel = await prisma.channel.findUnique({
      where: { publicKey: key },
      select: { config: true, isActive: true },
    });

    if (!channel || !channel.isActive) {
      return errorResponse("Channel not found", 404);
    }

    const appearance = resolveAppearance(
      channel.config as Record<string, unknown> | null,
    );

    return jsonResponse({ appearance });
  } catch (e) {
    console.error(
      "[widget/config]",
      e instanceof Error ? e.message : e,
    );
    return errorResponse("Internal server error", 500);
  }
}
