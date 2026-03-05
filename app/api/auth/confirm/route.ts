import { type EmailOtpType } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales, defaultLocale } from "@/lib/i18n/routing";

/**
 * Email confirmation route — handles email links for password recovery.
 *
 * Instead of relying on Supabase's /auth/v1/verify endpoint (which can
 * fail with PKCE flow state expiration), we verify the OTP directly
 * using supabase.auth.verifyOtp() on our server.
 *
 * Email template should link to:
 *   {{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password
 */

const VALID_OTP_TYPES = new Set<string>(["recovery"]);
const VALID_LOCALES = new Set<string>(locales as readonly string[]);

function sanitizeRedirectPath(rawNext: string | null): string {
  const fallback = "/";
  if (!rawNext) return fallback;

  const cleaned = rawNext.replace(/[\x00-\x1f\x7f]/g, "");
  if (!cleaned.startsWith("/") || cleaned.startsWith("//")) return fallback;
  if (cleaned.includes("://")) return fallback;
  if (cleaned.includes("\\")) return fallback;
  if (cleaned.includes("@")) return fallback;

  try {
    const testOrigin = "https://self.test";
    const testUrl = new URL(cleaned, testOrigin);
    if (testUrl.origin !== testOrigin) return fallback;
    return testUrl.pathname + testUrl.search + testUrl.hash;
  } catch {
    return fallback;
  }
}

function sanitizeLocale(raw: string | null): string {
  return raw && VALID_LOCALES.has(raw) ? raw : defaultLocale;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = sanitizeRedirectPath(searchParams.get("next"));
  const locale = sanitizeLocale(searchParams.get("locale"));

  if (tokenHash && type && VALID_OTP_TYPES.has(type)) {
    const cookiesToSet: Array<{
      name: string;
      value: string;
      options: Record<string, unknown>;
    }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookies) {
            cookiesToSet.push(...cookies);
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      type: type as EmailOtpType,
      token_hash: tokenHash,
    });

    if (!error) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = `/${locale}${next}`;
      redirectUrl.searchParams.delete("token_hash");
      redirectUrl.searchParams.delete("type");
      redirectUrl.searchParams.delete("next");
      redirectUrl.searchParams.delete("locale");

      const response = NextResponse.redirect(redirectUrl);
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Record<string, string>);
      });
      return response;
    }

    console.error("[auth/confirm] verifyOtp failed:", error.message);
  }

  // Error — redirect to login with error indicator
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = `/${locale}/login`;
  loginUrl.searchParams.delete("token_hash");
  loginUrl.searchParams.delete("type");
  loginUrl.searchParams.delete("next");
  loginUrl.searchParams.delete("locale");
  loginUrl.searchParams.set("error", "link_expired");

  return NextResponse.redirect(loginUrl);
}
