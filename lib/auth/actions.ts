"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderResetPasswordEmail } from "@/lib/email/reset-password";
import { Resend } from "resend";
import { locales, defaultLocale } from "@/lib/i18n/routing";

/** Validate locale against allowed list to prevent path injection */
function sanitizeLocale(raw: unknown): string {
  const locale = typeof raw === "string" ? raw : defaultLocale;
  return (locales as readonly string[]).includes(locale) ? locale : defaultLocale;
}

// --- State type for useActionState ---
export type AuthState = {
  error?: string;
  success?: string;
} | null;

// --- Zod schemas ---
const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(254),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
  });

// --- LOGIN ---
export async function login(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "invalidCredentials" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return { error: "invalidCredentials" };
  }

  const locale = sanitizeLocale(formData.get("locale"));
  revalidatePath("/", "layout");
  redirect(`/${locale}/`);
}

// --- LOGOUT ---
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/en/login");
}

// --- FORGOT PASSWORD ---
export async function forgotPassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "invalidEmail" };
  }

  const locale = sanitizeLocale(formData.get("locale"));
  const lang = locale === "es" ? "es" : "en";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // Generate recovery link via admin API (returns token_hash)
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "recovery",
      email: parsed.data.email,
    });

    if (error || !data?.properties?.hashed_token) {
      // Silently fail — don't reveal if email exists
      return { success: "resetEmailSent" };
    }

    // Build reset URL pointing to our confirm route
    const resetUrl = `${appUrl}/api/auth/confirm?token_hash=${data.properties.hashed_token}&type=recovery&next=/update-password&locale=${locale}`;

    // Render bilingual email
    const { subject, html } = renderResetPasswordEmail({ resetUrl, lang });

    // Send via Resend
    const resend = new Resend(process.env.RESEND_API_KEY!);
    await resend.emails.send({
      from: "ChatFlow360 <noreply@chatflow360.com>",
      to: [parsed.data.email],
      subject,
      html,
    });
  } catch (err) {
    console.error("[forgotPassword] Error:", err);
  }

  // Always return success — don't reveal if email exists
  return { success: "resetEmailSent" };
}

// --- UPDATE PASSWORD ---
export async function updatePassword(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    if (firstIssue?.path?.includes("confirmPassword")) {
      return { error: "passwordsMismatch" };
    }
    return { error: "passwordTooShort" };
  }

  const supabase = await createClient();

  // PWR-03: Verify this is a recovery session (not a regular login)
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const isRecoverySession = (aal?.currentAuthenticationMethods ?? []).some(
    (entry) => (typeof entry === "string" ? entry : entry.method) === "otp"
  );
  if (!isRecoverySession) {
    return { error: "sessionExpired" };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "updateFailed" };
  }

  const locale = sanitizeLocale(formData.get("locale"));
  revalidatePath("/", "layout");
  redirect(`/${locale}/`);
}
