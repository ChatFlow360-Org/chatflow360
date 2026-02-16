import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  // Fetch admin context for super_admin
  let adminContext: {
    organizations: { id: string; name: string; channels: { id: string; name: string; type: string }[] }[];
    selectedOrgId: string;
    selectedChannelId: string;
  } | undefined;

  if (user?.isSuperAdmin) {
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      include: { channels: { where: { isActive: true }, select: { id: true, name: true, type: true }, orderBy: { name: "asc" } } },
      orderBy: { name: "asc" },
    });

    const cookieStore = await cookies();
    const selectedOrgId = cookieStore.get("selectedOrgId")?.value || "";
    const selectedChannelId = cookieStore.get("selectedChannelId")?.value || "";

    adminContext = {
      organizations: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        channels: o.channels.map((c) => ({ id: c.id, name: c.name, type: c.type })),
      })),
      selectedOrgId,
      selectedChannelId,
    };
  }

  return (
    <DashboardShell
      isSuperAdmin={user?.isSuperAdmin ?? false}
      userName={user?.fullName || user?.email || ""}
      userEmail={user?.email || ""}
      adminContext={adminContext}
    >
      {children}
    </DashboardShell>
  );
}
