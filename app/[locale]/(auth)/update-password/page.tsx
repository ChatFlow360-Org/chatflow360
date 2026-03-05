"use client";

import { useState, useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import { Eye, EyeOff, RefreshCw, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { cn } from "@/lib/utils";
import { updatePassword, type AuthState } from "@/lib/auth/actions";

export default function UpdatePasswordPage() {
  const t = useTranslations("auth");
  const tp = useTranslations("auth.updatePassword");
  const locale = useLocale();

  const [state, formAction, isPending] = useActionState<AuthState, FormData>(
    updatePassword,
    null
  );

  const [passwordValue, setPasswordValue] = useState("");
  const [confirmValue, setConfirmValue] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordChecks = [
    { key: "pwMin8" as const, pass: passwordValue.length >= 8 },
    { key: "pwUppercase" as const, pass: /[A-Z]/.test(passwordValue) },
    { key: "pwLowercase" as const, pass: /[a-z]/.test(passwordValue) },
    { key: "pwNumber" as const, pass: /[0-9]/.test(passwordValue) },
    { key: "pwSymbol" as const, pass: /[^A-Za-z0-9]/.test(passwordValue) },
  ];

  const generatePassword = () => {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghjkmnpqrstuvwxyz";
    const digits = "23456789";
    const symbols = "!@#$%&*_+-=";
    const all = upper + lower + digits + symbols;

    const secureRandom = (max: number) => {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      return array[0] % max;
    };

    const required = [
      upper[secureRandom(upper.length)],
      lower[secureRandom(lower.length)],
      digits[secureRandom(digits.length)],
      symbols[secureRandom(symbols.length)],
    ];

    const remaining = Array.from({ length: 12 }, () =>
      all[secureRandom(all.length)]
    );

    const chars = [...required, ...remaining];
    for (let i = chars.length - 1; i > 0; i--) {
      const j = secureRandom(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const generated = chars.join("");
    setPasswordValue(generated);
    setConfirmValue(generated);
    setShowPassword(true);
    setShowConfirm(true);
  };

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

          {/* New Password */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                {tp("newPassword")}
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 cursor-pointer gap-1 px-2 text-[11px] text-cta hover:text-cta/80"
                onClick={generatePassword}
              >
                <RefreshCw className="h-3 w-3" />
                {tp("generate")}
              </Button>
            </div>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                required
                minLength={8}
                maxLength={128}
                value={passwordValue}
                onChange={(e) => setPasswordValue(e.target.value)}
                className="h-10 pr-10 bg-background dark:border-muted-foreground/20 dark:bg-muted/30"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {/* Validation checklist */}
            {passwordValue.length > 0 && (
              <ul className="space-y-0.5 pt-1">
                {passwordChecks.map(({ key, pass }) => (
                  <li key={key} className="flex items-center gap-1.5">
                    <Check className={cn("h-3 w-3", pass ? "text-emerald-500" : "text-muted-foreground/30")} />
                    <span className={cn("text-[11px]", pass ? "text-emerald-500" : "text-muted-foreground")}>
                      {tp(key)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
              {tp("confirmPassword")}
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                required
                minLength={8}
                maxLength={128}
                value={confirmValue}
                onChange={(e) => setConfirmValue(e.target.value)}
                className="h-10 pr-10 bg-background dark:border-muted-foreground/20 dark:bg-muted/30"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm(!showConfirm)}
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={cn(
              "flex h-10 w-full cursor-pointer items-center justify-center rounded-lg bg-cta text-sm font-semibold text-white transition-colors hover:bg-cta/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cta/50",
              isPending && "opacity-70 cursor-not-allowed"
            )}
          >
            {isPending ? tp("updating") : tp("update")}
          </button>
        </form>
      </div>
    </div>
  );
}
