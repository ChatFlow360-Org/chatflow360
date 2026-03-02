import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { PromptTemplatesClient } from "./prompt-templates-client";
import type { PieceType } from "@/lib/prompt-pieces";

export default async function PromptTemplatesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/en/login");
  if (!user.isSuperAdmin) redirect("/en/");

  const categories = await prisma.businessCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      pieces: { orderBy: { sortOrder: "asc" } },
      _count: { select: { pieces: true } },
    },
  });

  // Fetch global rules (categoryId is null)
  const globalRules = await prisma.promptPiece.findMany({
    where: { categoryId: { equals: null }, type: "rule" },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <PromptTemplatesClient
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        sortOrder: c.sortOrder,
        piecesCount: c._count.pieces,
        pieces: c.pieces.map((p) => ({
          id: p.id,
          categoryId: p.categoryId,
          type: p.type as PieceType,
          name: p.name,
          content: p.content,
          sortOrder: p.sortOrder,
        })),
      }))}
      globalRules={globalRules.map((r) => ({
        id: r.id,
        name: r.name,
        content: r.content,
        sortOrder: r.sortOrder,
      }))}
    />
  );
}
