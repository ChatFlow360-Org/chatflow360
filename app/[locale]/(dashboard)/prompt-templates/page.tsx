import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { PromptTemplatesClient } from "./prompt-templates-client";
import type { PromptStructure } from "@/lib/chat/prompt-builder";

export default async function PromptTemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/en/login");
  if (!user.isSuperAdmin) redirect("/en/");

  const templates = await prisma.promptTemplate.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      structure: true,
      updatedAt: true,
    },
  });

  return (
    <PromptTemplatesClient
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        structure: t.structure as unknown as PromptStructure,
        updatedAt: t.updatedAt.toISOString(),
      }))}
    />
  );
}
