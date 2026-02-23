import { redirect } from "next/navigation";
import { fetchDashboardData } from "@/lib/dashboard/stats";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardHome() {
  const data = await fetchDashboardData();

  if (!data) {
    redirect("/en/login");
  }

  return <DashboardClient initialData={data} />;
}
