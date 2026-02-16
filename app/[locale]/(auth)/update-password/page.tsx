"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { updatePassword, type AuthState } from "@/lib/auth/actions";

export default function UpdatePasswordPage() {
  const t = useTranslations("auth");
  const locale = useLocale();

  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    updatePassword,
    null
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-card p-6 sm:p-8">
      {/* Top-right corner: Theme Toggle */}
      <div className="fixed right-6 top-6">
        <ThemeToggle />
      </div>

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
            {t("updatePassword.title")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("updatePassword.subtitle")}
          </p>
        </div>

        {/* Error message */}
        {state?.error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {t(`errors.${state.error}`)}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="locale" value={locale} />

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-foreground">
              {t("updatePassword.newPassword")}
            </Label>
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

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              {t("updatePassword.confirmPassword")}
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
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
            {isPending ? t("updatePassword.updating") : t("updatePassword.update")}
          </button>
        </form>
      </div>
    </div>
  );
}
