"use client";

import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";

export interface AdminContext {
  organizations: { id: string; name: string; channels: { id: string; name: string; type: string }[] }[];
  selectedOrgId: string;
  selectedChannelId: string;
}

interface DashboardShellProps {
  children: React.ReactNode;
  isSuperAdmin: boolean;
  userName: string;
  userEmail: string;
  adminContext?: AdminContext;
}

export function DashboardShell({
  children,
  isSuperAdmin,
  userName,
  userEmail,
  adminContext,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 cursor-pointer bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isSuperAdmin={isSuperAdmin}
        userName={userName}
        userEmail={userEmail}
        adminContext={adminContext}
      />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(true)}
          userName={userName}
          userEmail={userEmail}
          organizationName={
            adminContext?.selectedOrgId
              ? adminContext.organizations.find((o) => o.id === adminContext.selectedOrgId)?.name
              : undefined
          }
        />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
