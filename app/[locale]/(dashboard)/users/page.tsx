import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { UsersClient } from "./users-client";

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user?.isSuperAdmin) redirect("/");

  const [users, organizations] = await Promise.all([
    prisma.user.findMany({
      include: {
        memberships: {
          include: { organization: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialize for client component
  const serializedUsers = users.map((u) => ({
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    isSuperAdmin: u.isSuperAdmin,
    createdAt: u.createdAt.toISOString(),
    membership: u.memberships[0]
      ? {
          organizationId: u.memberships[0].organizationId,
          organizationName: u.memberships[0].organization.name,
          role: u.memberships[0].role,
        }
      : null,
  }));

  const serializedOrgs = organizations.map((org) => ({
    id: org.id,
    name: org.name,
  }));

  return <UsersClient users={serializedUsers} organizations={serializedOrgs} currentUserId={user.id} />;
}
