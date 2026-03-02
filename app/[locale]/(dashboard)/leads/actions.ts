"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/user";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function resolveOrganizationId(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  if (user.isSuperAdmin) {
    const cookieStore = await cookies();
    const rawOrgId = cookieStore.get("selectedOrgId")?.value || "";
    return UUID_RE.test(rawOrgId) ? rawOrgId : null;
  }

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: user.id },
    select: { organizationId: true },
  });

  return membership?.organizationId || null;
}

export async function deleteLead(leadId: string) {
  const organizationId = await resolveOrganizationId();
  if (!organizationId) return { success: false };

  // Ensure lead belongs to this organization
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
  });

  if (!lead) return { success: false };

  await prisma.lead.delete({ where: { id: leadId } });
  return { success: true };
}
