"use client";

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
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/lib/i18n/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

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
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  isSuperAdmin?: boolean;
  userName?: string;
  userEmail?: string;
}

export function Sidebar({ isOpen, onClose, isSuperAdmin, userName, userEmail }: SidebarProps) {
  const pathname = usePathname();
  const t = useTranslations("layout.sidebar");

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
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
