"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  LayoutDashboard,
  MessageSquare,
  // Radio,
  Settings,
  // BarChart3,
  Building2,
  Users,
  LayoutTemplate,
  Key,
  X,
  ChevronsUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, usePathname, useRouter } from "@/lib/i18n/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdminContext } from "@/components/layout/dashboard-shell";

const navItems = [
  { labelKey: "dashboard" as const, href: "/" as const, icon: LayoutDashboard },
  { labelKey: "conversations" as const, href: "/conversations" as const, icon: MessageSquare },
  // { labelKey: "channels" as const, href: "/channels" as const, icon: Radio },
  { labelKey: "settings" as const, href: "/settings/ai" as const, icon: Settings },
  // { labelKey: "reports" as const, href: "/reports" as const, icon: BarChart3 },
];

const adminItems = [
  { labelKey: "organizations" as const, href: "/organizations" as const, icon: Building2 },
  { labelKey: "users" as const, href: "/users" as const, icon: Users },
  { labelKey: "promptTemplates" as const, href: "/prompt-templates" as const, icon: LayoutTemplate },
  { labelKey: "apiKeys" as const, href: "/settings/api-keys" as const, icon: Key },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isSuperAdmin?: boolean;
  userName?: string;
  userEmail?: string;
  adminContext?: AdminContext;
}

export function Sidebar({ isOpen, onClose, isSuperAdmin, userName, userEmail, adminContext }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("layout.sidebar");

  const [selectedOrg, setSelectedOrg] = useState(adminContext?.selectedOrgId || "");
  const [selectedChannel, setSelectedChannel] = useState(adminContext?.selectedChannelId || "");

  const organizations = adminContext?.organizations || [];
  const currentOrg = organizations.find((o) => o.id === selectedOrg);
  const channels = currentOrg?.channels || [];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const handleOrgChange = (orgId: string) => {
    const newOrgId = orgId === "none" ? "" : orgId;
    setSelectedOrg(newOrgId);
    setSelectedChannel("");
    document.cookie = `selectedOrgId=${newOrgId};path=/;max-age=${60 * 60 * 24 * 90};SameSite=Lax;Secure`;
    document.cookie = "selectedChannelId=;path=/;max-age=0;SameSite=Lax;Secure";
    router.refresh();
  };

  const handleChannelChange = (channelId: string) => {
    const newChannelId = channelId === "none" ? "" : channelId;
    setSelectedChannel(newChannelId);
    document.cookie = `selectedChannelId=${newChannelId};path=/;max-age=${60 * 60 * 24 * 90};SameSite=Lax;Secure`;
    router.refresh();
  };

  const initials = userName
    ? userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : userEmail
      ? userEmail[0].toUpperCase()
      : "?";

  return (
    <aside
      className={cn(
        "flex h-full w-[260px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-[1px_0_8px_rgba(28,46,71,0.06)] dark:shadow-none",
        "fixed inset-y-0 left-0 z-40 lg:relative lg:z-0",
        "transition-transform duration-200 ease-in-out",
        isOpen === false && "max-lg:-translate-x-full"
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-5 py-4">
        <Image
          src="/logo.png"
          alt="ChatFlow360"
          width={200}
          height={42}
          className="w-auto max-w-[180px] dark:brightness-0 dark:invert"
          priority
        />
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-sidebar-foreground lg:hidden"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Admin Context Selectors */}
      {isSuperAdmin && organizations.length > 0 && (
        <div className="space-y-2 border-b border-sidebar-border px-3 py-3">
          <p className="px-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
            {t("context")}
          </p>

          {/* Organization Selector */}
          <Select value={selectedOrg || "none"} onValueChange={handleOrgChange}>
            <SelectTrigger className="h-8 bg-sidebar-accent/50 text-xs [&>svg]:hidden">
              <div className="flex w-full items-center gap-2">
                <Building2 className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                <SelectValue placeholder={t("selectOrg")} />
                <ChevronsUpDown className="ml-auto h-3 w-3 shrink-0 text-sidebar-foreground/40" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none" className="text-xs text-muted-foreground">
                {t("allOrganizations")}
              </SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id} className="text-xs">
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Channel Selector — only when org is selected */}
          {selectedOrg && (
            <Select value={selectedChannel || "none"} onValueChange={handleChannelChange}>
              <SelectTrigger className="h-8 bg-sidebar-accent/50 text-xs [&>svg]:hidden">
                <div className="flex w-full items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/50" />
                  <SelectValue placeholder={t("selectChannel")} />
                  <ChevronsUpDown className="ml-auto h-3 w-3 shrink-0 text-sidebar-foreground/40" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-xs text-muted-foreground">
                  {t("allChannels")}
                </SelectItem>
                {channels.length > 0 ? (
                  channels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id} className="text-xs">
                      {ch.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    {t("noChannels")}
                  </div>
                )}
              </SelectContent>
            </Select>
          )}
        </div>
      )}

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(item.labelKey)}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Admin Section */}
        {isSuperAdmin && (
          <div className="mt-4">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
              {t("admin")}
            </p>
            <ul className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t(item.labelKey)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer: Theme + User */}
      <div className="border-t border-sidebar-border px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-sidebar-accent text-xs text-sidebar-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-xs font-medium text-sidebar-foreground">
                {userName || userEmail || "User"}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50">
                {userEmail || ""}
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
