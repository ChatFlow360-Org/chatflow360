import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/user";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/db/prisma";

const MAX_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const BUCKET = "logos";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const channelId = request.nextUrl.searchParams.get("channelId");
    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    // Verify user has access to this channel's org (or is super admin)
    if (!user.isSuperAdmin) {
      const channel = await prisma.channel.findUnique({
        where: { id: channelId },
        select: { organizationId: true },
      });
      if (!channel) {
        return NextResponse.json({ error: "Channel not found" }, { status: 404 });
      }
      const isMember = user.memberships.some(
        (m) => m.organizationId === channel.organizationId,
      );
      if (!isMember) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 413 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Use PNG, JPEG, or WebP" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Ensure bucket exists (idempotent)
    await supabase.storage.createBucket(BUCKET, {
      public: true,
      allowedMimeTypes: ALLOWED_TYPES,
      fileSizeLimit: MAX_SIZE,
    });

    // Upload (upsert to replace existing logo)
    const filePath = `${channelId}.png`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: "image/png",
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      console.error("[POST /api/upload/logo] Upload error:", uploadError);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch (error) {
    console.error(
      "[POST /api/upload/logo]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
