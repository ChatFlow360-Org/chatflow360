import { getCurrentUser } from "@/lib/auth/user";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <DashboardShell
      isSuperAdmin={user?.isSuperAdmin ?? false}
      userName={user?.fullName || user?.email || ""}
      userEmail={user?.email || ""}
    >
      {children}
    </DashboardShell>
  );
}
