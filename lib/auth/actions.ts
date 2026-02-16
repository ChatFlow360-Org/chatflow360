"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

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

  const locale = (formData.get("locale") as string) || "en";
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

  const supabase = await createClient();

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/api/auth/callback?next=/update-password`,
  });

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
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: "updateFailed" };
  }

  const locale = (formData.get("locale") as string) || "en";
  revalidatePath("/", "layout");
  redirect(`/${locale}/`);
}
