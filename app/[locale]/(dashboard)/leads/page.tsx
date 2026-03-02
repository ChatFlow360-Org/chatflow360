import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { LeadsClient } from "./leads-client";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function LeadsPage() {
  const t = await getTranslations("leads");
  const user = await getCurrentUser();
  if (!user) redirect("/en/login");

  // Determine which org to filter by
  let orgFilter: string | undefined;

  if (user.isSuperAdmin) {
    const cookieStore = await cookies();
    const rawOrgId = cookieStore.get("selectedOrgId")?.value || "";
    orgFilter = UUID_RE.test(rawOrgId) ? rawOrgId : undefined;
  } else {
    const membership = await prisma.organizationMember.findFirst({
      where: { userId: user.id },
      select: { organizationId: true },
    });
    if (membership) {
      orgFilter = membership.organizationId;
    }
  }

  if (!orgFilter) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm text-muted-foreground">{t("selectOrgFirst")}</p>
      </div>
    );
  }

  const leads = await prisma.lead.findMany({
    where: { organizationId: orgFilter },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      ip: true,
      pageUrl: true,
      createdAt: true,
    },
  });

  return (
    <LeadsClient
      leads={leads.map((l) => ({
        ...l,
        createdAt: l.createdAt.toISOString(),
      }))}
    />
  );
}
