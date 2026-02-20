import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { prisma } from "@/lib/db/prisma";
import { ApiKeysClient } from "./api-keys-client";

export default async function ApiKeysPage() {
  const user = await getCurrentUser();
  if (!user?.isSuperAdmin) redirect("/en/login");

  const globalKey = await prisma.platformSettings.findUnique({
    where: { key: "openai_api_key" },
    select: { hint: true },
  });

  return <ApiKeysClient globalKeyHint={globalKey?.hint || null} />;
}
