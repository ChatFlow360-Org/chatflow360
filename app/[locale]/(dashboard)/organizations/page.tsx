import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { OrganizationsClient } from "./organizations-client";

export default async function OrganizationsPage() {
  const user = await getCurrentUser();
  if (!user?.isSuperAdmin) redirect("/");

  const organizations = await prisma.organization.findMany({
    include: {
      _count: {
        select: {
          members: true,
          channels: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Serialize dates for client component
  const serialized = organizations.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan,
    isActive: org.isActive,
    membersCount: org._count.members,
    channelsCount: org._count.channels,
    createdAt: org.createdAt.toISOString(),
  }));

  return <OrganizationsClient organizations={serialized} />;
}
