"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bell, LogOut, Menu, User } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, usePathname } from "@/lib/i18n/navigation";
import { mockUser, mockOrganization } from "@/lib/mock/data";
import type { Locale } from "@/lib/i18n/routing";

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("layout.header");

  const switchLocale = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  const currentDate = new Date().toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 shadow-[0_1px_4px_rgba(28,46,71,0.05)] dark:shadow-none lg:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:hidden"
          onClick={onMenuClick}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{mockOrganization.name}</h2>
          <p className="text-xs text-muted-foreground">{currentDate}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex h-7 items-center rounded-full border border-border bg-muted/40 p-0.5">
          <button
            onClick={() => switchLocale("en")}
            className={`flex h-6 items-center rounded-full px-2 text-[11px] font-semibold tracking-wide transition-all ${
              locale === "en"
                ? "bg-cta text-cta-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            EN
          </button>
          <button
            onClick={() => switchLocale("es")}
            className={`flex h-6 items-center rounded-full px-2 text-[11px] font-semibold tracking-wide transition-all ${
              locale === "es"
                ? "bg-cta text-cta-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ES
          </button>
        </div>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cta" />
        </Button>
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded-full outline-none ring-ring focus-visible:ring-2">
              <Avatar className="h-8 w-8 cursor-pointer">
                <AvatarFallback className="bg-primary text-xs text-primary-foreground">
                  {mockUser.name.split(" ").map((n) => n[0]).join("")}
                </AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-56 overflow-visible! dark:border-muted-foreground/20">
            <div className="absolute -top-[6px] right-[16px] z-10 h-3 w-3 rotate-45 border-l border-t border-border bg-popover shadow-[-2px_-2px_3px_rgba(28,46,71,0.06)] dark:border-muted-foreground/20 dark:shadow-[-2px_-2px_4px_rgba(0,0,0,0.4)]" />
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{mockUser.name}</p>
                <p className="text-xs text-muted-foreground">{mockUser.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              {t("myProfile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              {t("logout")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
