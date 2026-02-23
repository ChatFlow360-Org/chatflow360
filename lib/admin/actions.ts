"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/user";
import { DEFAULT_HANDOFF_KEYWORDS } from "@/lib/chat/defaults";

// ============================================
// Types
// ============================================

export type AdminActionState = {
  error?: string;
  success?: string;
} | null;

// ============================================
// Auth Guard
// ============================================

async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!user?.isSuperAdmin) {
    throw new Error("Unauthorized");
  }
  return user;
}

// ============================================
// Organizations
// ============================================

const createOrgSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  plan: z.enum(["starter", "pro", "growth"]).default("starter"),
});

const updateOrgSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  plan: z.enum(["starter", "pro", "growth"]),
  isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});

export async function createOrganization(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    const parsed = createOrgSchema.safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      plan: formData.get("plan") || "starter",
    });

    if (!parsed.success) {
      return { error: "orgNameRequired" };
    }

    // Check slug uniqueness
    const existing = await prisma.organization.findUnique({
      where: { slug: parsed.data.slug },
    });
    if (existing) {
      return { error: "slugExists" };
    }

    // Create org + default AI settings
    await prisma.organization.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        plan: parsed.data.plan,
        aiSettings: {
          create: {
            provider: "openai",
            model: "gpt-4o-mini",
            temperature: 0.7,
            maxTokens: 500,
          },
        },
      },
    });

    revalidatePath("/organizations");
    return { success: "organizationCreated" };
  } catch (e) {
    console.error("[createOrganization]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

export async function updateOrganization(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    const parsed = updateOrgSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      plan: formData.get("plan"),
      isActive: formData.get("isActive"),
    });

    if (!parsed.success) {
      return { error: "orgNameRequired" };
    }

    await prisma.organization.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        plan: parsed.data.plan,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/organizations");
    return { success: "organizationUpdated" };
  } catch (e) {
    console.error("[updateOrganization]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

export async function deleteOrganization(id: string): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    // Validate UUID to prevent injection
    z.string().uuid().parse(id);

    await prisma.organization.delete({
      where: { id },
    });

    revalidatePath("/organizations");
    return { success: "organizationDeleted" };
  } catch (e) {
    console.error("[deleteOrganization]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

// ============================================
// Users
// ============================================

const createUserSchema = z.object({
  email: z.string().email().max(254),
  fullName: z.string().min(1).max(100),
  password: z.string().min(8).max(128),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  role: z.enum(["admin", "agent"]).optional(),
});

const updateUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(1).max(100),
  organizationId: z.string().uuid().optional().or(z.literal("")),
  role: z.enum(["admin", "agent"]).optional(),
});

export async function createUser(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    const parsed = createUserSchema.safeParse({
      email: formData.get("email"),
      fullName: formData.get("fullName"),
      password: formData.get("password"),
      organizationId: formData.get("organizationId") || "",
      role: formData.get("role") || undefined,
    });

    if (!parsed.success) {
      const firstError = parsed.error.issues[0];
      if (firstError?.path[0] === "email") return { error: "emailRequired" };
      if (firstError?.path[0] === "password") return { error: "passwordTooShort" };
      return { error: "createFailed" };
    }

    const supabase = createAdminClient();

    // Step 1: Create in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email: parsed.data.email,
        password: parsed.data.password,
        email_confirm: true,
      });

    if (authError) {
      if (authError.message?.includes("already been registered")) {
        return { error: "emailExists" };
      }
      return { error: "createFailed" };
    }

    const supabaseUserId = authData.user.id;

    // Step 2: Create in Prisma (with rollback if fails)
    try {
      await prisma.user.create({
        data: {
          id: supabaseUserId,
          email: parsed.data.email,
          fullName: parsed.data.fullName,
          isSuperAdmin: false,
        },
      });

      // Step 3: Assign to organization if specified
      const orgId = parsed.data.organizationId;
      if (orgId && orgId !== "") {
        await prisma.organizationMember.create({
          data: {
            userId: supabaseUserId,
            organizationId: orgId,
            role: parsed.data.role || "admin",
          },
        });
      }
    } catch (e) {
      // Rollback: delete from Supabase Auth if Prisma fails
      console.error("[createUser] Prisma step failed, rolling back auth:", e instanceof Error ? e.message : e);
      await supabase.auth.admin.deleteUser(supabaseUserId);
      return { error: "createFailed" };
    }

    revalidatePath("/users");
    return { success: "userCreated" };
  } catch (e) {
    console.error("[createUser]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

export async function updateUser(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    const parsed = updateUserSchema.safeParse({
      id: formData.get("id"),
      fullName: formData.get("fullName"),
      organizationId: formData.get("organizationId") || "",
      role: formData.get("role") || undefined,
    });

    if (!parsed.success) {
      return { error: "createFailed" };
    }

    // Atomic: update name + membership in a single transaction
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: parsed.data.id },
        data: { fullName: parsed.data.fullName },
      });

      const orgId = parsed.data.organizationId;

      await tx.organizationMember.deleteMany({
        where: { userId: parsed.data.id },
      });

      if (orgId && orgId !== "") {
        await tx.organizationMember.create({
          data: {
            userId: parsed.data.id,
            organizationId: orgId,
            role: parsed.data.role || "admin",
          },
        });
      }
    });

    revalidatePath("/users");
    return { success: "userUpdated" };
  } catch (e) {
    console.error("[updateUser]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

export async function deleteUser(id: string): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    // Validate UUID to prevent injection
    z.string().uuid().parse(id);

    // Don't allow deleting yourself
    const currentUser = await getCurrentUser();
    if (currentUser?.id === id) {
      return { error: "createFailed" };
    }

    // Delete from Supabase Auth first (user can't log in anymore)
    const supabase = createAdminClient();
    await supabase.auth.admin.deleteUser(id);

    // Then delete from Prisma (cleanup)
    await prisma.user.delete({
      where: { id },
    });

    revalidatePath("/users");
    return { success: "userDeleted" };
  } catch (e) {
    console.error("[deleteUser]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

// ============================================
// AI Settings
// ============================================

const aiSettingsSchema = z.object({
  organizationId: z.string().uuid(),
  model: z.enum(["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"]),
  systemPrompt: z.string().max(4000).optional().nullable(),
  temperature: z.coerce.number().min(0).max(2),
  maxTokens: z.coerce.number().int().min(100).max(4000),
  handoffKeywords: z.preprocess(
    (val) =>
      typeof val === "string"
        ? val.split(",").map((k: string) => k.trim()).filter(Boolean)
        : [],
    z.array(z.string().max(50)).max(20)
  ),
  apiKey: z.string().max(200).optional().or(z.literal("")),
});

export async function upsertAiSettings(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    // Allow super_admin OR org member (admin/agent) to edit AI settings
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const orgId = formData.get("organizationId") as string;

    if (!user.isSuperAdmin) {
      // Verify user belongs to this organization
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id, organizationId: orgId },
      });
      if (!membership) throw new Error("Unauthorized");
    }

    const parsed = aiSettingsSchema.safeParse({
      organizationId: formData.get("organizationId"),
      model: formData.get("model"),
      systemPrompt: formData.get("systemPrompt") || null,
      temperature: formData.get("temperature"),
      maxTokens: formData.get("maxTokens"),
      handoffKeywords: formData.get("handoffKeywords"),
      apiKey: formData.get("apiKey") || "",
    });

    if (!parsed.success) {
      return { error: "createFailed" };
    }

    // Verify org exists
    const org = await prisma.organization.findUnique({
      where: { id: parsed.data.organizationId },
    });
    if (!org) {
      return { error: "createFailed" };
    }

    // Handle optional per-org API key (super_admin only)
    let encryptedApiKey: string | undefined;
    let apiKeyHint: string | undefined;

    if (user.isSuperAdmin) {
      const rawApiKey = parsed.data.apiKey;
      if (rawApiKey && rawApiKey.trim() !== "") {
        const { encrypt, maskApiKey } = await import("@/lib/crypto/encryption");
        encryptedApiKey = encrypt(rawApiKey.trim());
        apiKeyHint = maskApiKey(rawApiKey.trim());
      }
    }

    // Business params: editable by org admin + super_admin
    const businessUpdate = {
      systemPrompt: parsed.data.systemPrompt,
      handoffKeywords: parsed.data.handoffKeywords,
    };

    // Technical params: editable by super_admin only
    const technicalUpdate = user.isSuperAdmin
      ? {
          model: parsed.data.model,
          temperature: parsed.data.temperature,
          maxTokens: parsed.data.maxTokens,
          ...(encryptedApiKey && { encryptedApiKey, apiKeyHint }),
        }
      : {};

    await prisma.aiSettings.upsert({
      where: { organizationId: parsed.data.organizationId },
      update: {
        ...businessUpdate,
        ...technicalUpdate,
      },
      create: {
        organizationId: parsed.data.organizationId,
        provider: "openai",
        model: parsed.data.model,
        systemPrompt: parsed.data.systemPrompt,
        temperature: parsed.data.temperature,
        maxTokens: parsed.data.maxTokens,
        handoffKeywords: parsed.data.handoffKeywords.length > 0
          ? parsed.data.handoffKeywords
          : [...DEFAULT_HANDOFF_KEYWORDS],
        ...(encryptedApiKey && { encryptedApiKey, apiKeyHint }),
      },
    });

    revalidatePath("/settings/ai");
    return { success: "settingsSaved" };
  } catch (e) {
    console.error("[upsertAiSettings]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

// ============================================
// Channels
// ============================================

const createChannelSchema = z.object({
  organizationId: z.string().uuid(),
  name: z.string().min(1).max(100),
  type: z.enum(["website"]), // MVP: only website
});

const updateChannelSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  isActive: z.preprocess((v) => v === "true" || v === true, z.boolean()),
});

export async function createChannel(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    const parsed = createChannelSchema.safeParse({
      organizationId: formData.get("organizationId"),
      name: formData.get("name"),
      type: formData.get("type") || "website",
    });

    if (!parsed.success) {
      return { error: "channelNameRequired" };
    }

    // Verify org exists and check channel limit
    const org = await prisma.organization.findUnique({
      where: { id: parsed.data.organizationId },
      include: { _count: { select: { channels: true } } },
    });

    if (!org || !org.isActive) {
      return { error: "createFailed" };
    }

    if (org._count.channels >= org.maxChannels) {
      return { error: "channelLimitReached" };
    }

    await prisma.channel.create({
      data: {
        organizationId: parsed.data.organizationId,
        name: parsed.data.name,
        type: parsed.data.type,
        publicKey: crypto.randomUUID(),
      },
    });

    revalidatePath("/organizations");
    return { success: "channelCreated" };
  } catch (e) {
    console.error("[createChannel]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

export async function updateChannel(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    const parsed = updateChannelSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      isActive: formData.get("isActive"),
    });

    if (!parsed.success) {
      return { error: "channelNameRequired" };
    }

    await prisma.channel.update({
      where: { id: parsed.data.id },
      data: {
        name: parsed.data.name,
        isActive: parsed.data.isActive,
      },
    });

    revalidatePath("/organizations");
    return { success: "channelUpdated" };
  } catch (e) {
    console.error("[updateChannel]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

export async function deleteChannel(id: string): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    // Validate UUID to prevent injection
    z.string().uuid().parse(id);

    await prisma.channel.delete({
      where: { id },
    });

    revalidatePath("/organizations");
    return { success: "channelDeleted" };
  } catch (e) {
    console.error("[deleteChannel]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

// ============================================
// Conversation Messages (Read-only, any authenticated user)
// ============================================

export async function getConversationMessages(conversationId: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  z.string().uuid().parse(conversationId);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      senderType: true,
      content: true,
      createdAt: true,
      sender: { select: { fullName: true } },
    },
  });

  return messages.map((m) => ({
    id: m.id,
    conversationId,
    content: m.content,
    senderType: m.senderType as "visitor" | "ai" | "agent",
    senderName:
      m.senderType === "visitor"
        ? "Visitor"
        : m.senderType === "ai"
          ? "AI Assistant"
          : (m.sender?.fullName || "Agent"),
    createdAt: m.createdAt.toISOString(),
  }));
}

// ============================================
// Platform Settings (Global Keys)
// ============================================

const platformKeySchema = z.object({
  key: z.string().min(1).max(50),
  value: z.string().min(1).max(200),
});

export async function upsertPlatformKey(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    await requireSuperAdmin();

    const parsed = platformKeySchema.safeParse({
      key: formData.get("key"),
      value: formData.get("value"),
    });

    if (!parsed.success) {
      return { error: "createFailed" };
    }

    // Import dynamically to avoid loading crypto on every action
    const { encrypt, maskApiKey } = await import("@/lib/crypto/encryption");

    const encrypted = encrypt(parsed.data.value);
    const hint = maskApiKey(parsed.data.value);

    await prisma.platformSettings.upsert({
      where: { key: parsed.data.key },
      update: { value: encrypted, hint },
      create: { key: parsed.data.key, value: encrypted, hint },
    });

    revalidatePath("/settings/api-keys");
    return { success: "settingsSaved" };
  } catch (e) {
    console.error("[upsertPlatformKey]", e instanceof Error ? e.message : e);
    return { error: "createFailed" };
  }
}

// ============================================
// Knowledge Base (RAG)
// ============================================

const createKnowledgeSchema = z.object({
  organizationId: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(10).max(4000),
});

export async function createKnowledgeItem(
  _prevState: AdminActionState,
  formData: FormData
): Promise<AdminActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const parsed = createKnowledgeSchema.safeParse({
      organizationId: formData.get("organizationId"),
      title: formData.get("title"),
      content: formData.get("content"),
    });

    if (!parsed.success) {
      return { error: "createFailed" };
    }

    const orgId = parsed.data.organizationId;

    // Auth: super_admin or org member
    if (!user.isSuperAdmin) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id, organizationId: orgId },
      });
      if (!membership) throw new Error("Unauthorized");
    }

    // Generate embedding
    const { createOpenAIClient } = await import("@/lib/openai/client");
    const { generateEmbedding } = await import("@/lib/rag/embedding");
    const { createKnowledge } = await import("@/lib/rag/knowledge");

    const client = await createOpenAIClient(orgId);
    const { embedding, tokensUsed } = await generateEmbedding(
      client,
      `${parsed.data.title}\n\n${parsed.data.content}`
    );

    await createKnowledge(orgId, parsed.data.title, parsed.data.content, embedding, tokensUsed);

    revalidatePath("/settings/ai");
    return { success: "knowledgeCreated" };
  } catch (e) {
    console.error("[createKnowledgeItem]", e instanceof Error ? e.message : e);
    if (e instanceof Error && e.message === "Unauthorized") {
      return { error: "unauthorized" };
    }
    return { error: "createFailed" };
  }
}

export async function deleteKnowledgeItem(
  organizationId: string,
  knowledgeId: string
): Promise<AdminActionState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    z.string().uuid().parse(organizationId);
    z.string().uuid().parse(knowledgeId);

    // Auth: super_admin or org member
    if (!user.isSuperAdmin) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id, organizationId },
      });
      if (!membership) throw new Error("Unauthorized");
    }

    const { deleteKnowledge } = await import("@/lib/rag/knowledge");
    await deleteKnowledge(organizationId, knowledgeId);

    revalidatePath("/settings/ai");
    return { success: "knowledgeDeleted" };
  } catch (e) {
    console.error("[deleteKnowledgeItem]", e instanceof Error ? e.message : e);
    if (e instanceof Error && e.message === "Unauthorized") {
      return { error: "unauthorized" };
    }
    return { error: "deleteFailed" };
  }
}
