"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname, Link } from "@/lib/i18n/navigation";
import Image from "next/image";
import { Clock, Users, DollarSign, TrendingUp, Zap, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { login, type AuthState } from "@/lib/auth/actions";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    login,
    null
  );

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "en" | "es" });
  };

  const features = [
    { icon: Clock, key: "features.alwaysOn" as const, color: "text-emerald-400", bg: "bg-emerald-400/15" },
    { icon: Users, key: "features.moreLeads" as const, color: "text-emerald-400", bg: "bg-emerald-400/15" },
    { icon: DollarSign, key: "features.flatPrice" as const, color: "text-amber-400", bg: "bg-amber-400/15" },
    { icon: TrendingUp, key: "features.growth" as const, color: "text-violet-400", bg: "bg-violet-400/15" },
    { icon: Zap, key: "features.moreValue" as const, color: "text-rose-400", bg: "bg-rose-400/15" },
    { icon: Sparkles, key: "features.enterpriseAi" as const, color: "text-cyan-400", bg: "bg-cyan-400/15" },
  ];

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col items-center justify-between bg-[#0f1c2e] p-12 text-white border-r border-white/10">
        <div />

        {/* Center Content */}
        <div className="space-y-8 max-w-md">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              {t("branding.headline")}
            </h1>
            <p className="text-base text-white/60 leading-relaxed">
              {t("branding.subheadline")}
            </p>
          </div>

          {/* Feature Cards — 2x3 grid, title only */}
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.key} className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3.5 border border-white/5">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", feature.bg)}>
                    <Icon className={cn("h-4.5 w-4.5", feature.color)} />
                  </div>
                  <p className="text-sm font-semibold text-white leading-tight">{t(feature.key)}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/30">
          &copy; 2026 ChatFlow360. {t("branding.rights")}
        </p>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex w-full flex-col bg-card p-6 sm:p-8 lg:w-1/2 xl:w-[45%]">
        {/* Top: Theme + Language Toggle */}
        <div className="flex items-center justify-end gap-2">
          <ThemeToggle />
          <div className="flex items-center gap-0.5 rounded-full border border-border bg-muted/40 p-0.5">
            <button
              onClick={() => switchLocale("en")}
              className={cn(
                "h-6 cursor-pointer rounded-full px-2.5 text-xs font-medium transition-colors",
                locale === "en"
                  ? "bg-cta text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              EN
            </button>
            <button
              onClick={() => switchLocale("es")}
              className={cn(
                "h-6 cursor-pointer rounded-full px-2.5 text-xs font-medium transition-colors",
                locale === "es"
                  ? "bg-cta text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              ES
            </button>
          </div>
        </div>

        {/* Center: Form */}
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-sm space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
              <Image
                src="/logo.png"
                alt="ChatFlow360"
                width={180}
                height={36}
                className="dark:brightness-0 dark:invert"
                priority
              />
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {t("title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("subtitle")}
              </p>
            </div>

            {/* Error banner */}
            {state?.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {t(`errors.${state.error}`)}
              </div>
            )}

            <form action={formAction} className="space-y-5">
              <input type="hidden" name="locale" value={locale} />

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t("email")}
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t("emailPlaceholder")}
                  required
                  maxLength={254}
                  className="h-10 bg-background dark:border-muted-foreground/20 dark:bg-muted/30"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-foreground">
                    {t("password")}
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-cta hover:text-cta/80 transition-colors"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                  minLength={8}
                  maxLength={128}
                  className="h-10 bg-background dark:border-muted-foreground/20 dark:bg-muted/30"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className={cn(
                  "flex h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-cta text-sm font-semibold text-white transition-colors hover:bg-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50",
                  isPending && "opacity-70 cursor-not-allowed"
                )}
              >
                {isPending ? t("signingIn") : t("signIn")}
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              {t("noAccount")}{" "}
              <button type="button" className="cursor-pointer font-semibold text-cta hover:text-cta/80 transition-colors">
                {t("signUp")}
              </button>
            </p>
          </div>
        </div>

        {/* Bottom: Mobile Footer */}
        <p className="text-center text-xs text-muted-foreground/60 lg:hidden">
          &copy; 2026 ChatFlow360
        </p>
      </div>
    </div>
  );
}
