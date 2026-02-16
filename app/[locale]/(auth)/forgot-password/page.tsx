"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname, Link } from "@/lib/i18n/navigation";
import Image from "next/image";
import { ArrowLeft, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { forgotPassword, type AuthState } from "@/lib/auth/actions";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    forgotPassword,
    null
  );

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale as "en" | "es" });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel — Branding (same as login) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] flex-col items-center justify-between bg-[#0f1c2e] p-12 text-white border-r border-white/10">
        <div />
        <div className="space-y-8 max-w-md">
          <div className="space-y-3">
            <h1 className="text-3xl font-bold tracking-tight leading-tight">
              {t("branding.headline")}
            </h1>
            <p className="text-base text-white/60 leading-relaxed">
              {t("branding.subheadline")}
            </p>
          </div>
        </div>
        <p className="text-xs text-white/30">
          &copy; 2026 ChatFlow360. {t("branding.rights")}
        </p>
      </div>

      {/* Right Panel — Reset Form */}
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
                {t("resetPassword.title")}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t("resetPassword.subtitle")}
              </p>
            </div>

            {/* Success message */}
            {state?.success && (
              <div className="rounded-lg border border-cta/30 bg-cta/10 px-4 py-3 text-sm text-cta">
                <div className="flex items-start gap-2">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t(`success.${state.success}`)}</span>
                </div>
              </div>
            )}

            {/* Error message */}
            {state?.error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {t(`errors.${state.error}`)}
              </div>
            )}

            {/* Form — hide after success */}
            {!state?.success && (
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

                <button
                  type="submit"
                  disabled={isPending}
                  className={cn(
                    "flex h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-cta text-sm font-semibold text-white transition-colors hover:bg-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50",
                    isPending && "opacity-70 cursor-not-allowed"
                  )}
                >
                  {isPending ? t("resetPassword.sending") : t("resetPassword.sendLink")}
                </button>
              </form>
            )}

            {/* Back to login */}
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("resetPassword.backToLogin")}
            </Link>
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
