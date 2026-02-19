import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Allowed hosts for redirect targets.
 * Prevents open redirect via x-forwarded-host spoofing.
 */
const ALLOWED_HOSTS = new Set([
  "app.chatflow360.com",
]);

/**
 * Sanitize the "next" redirect parameter.
 * Multi-layer defense per OWASP open redirect prevention guidelines:
 * 1. Strip control characters
 * 2. Block dangerous patterns (backslash, @, scheme, protocol-relative)
 * 3. Verify final URL stays same-origin via URL constructor
 * 4. Return normalized path (prevents traversal)
 */
function sanitizeRedirectPath(rawNext: string | null): string {
  const fallback = "/";

  if (!rawNext) return fallback;

  // Layer 1: Strip control characters (tabs, newlines, null bytes, CR)
  const cleaned = rawNext.replace(/[\x00-\x1f\x7f]/g, "");

  // Layer 2: Must start with exactly one forward slash
  if (!cleaned.startsWith("/") || cleaned.startsWith("//")) {
    return fallback;
  }

  // Layer 3: Block scheme patterns
  if (cleaned.includes("://")) {
    return fallback;
  }

  // Layer 4: Block backslash (browser normalization differences)
  if (cleaned.includes("\\")) {
    return fallback;
  }

  // Layer 5: Block @ sign (URL userinfo abuse)
  if (cleaned.includes("@")) {
    return fallback;
  }

  // Layer 6: Final URL validation — must stay same-origin
  try {
    const testOrigin = "https://self.test";
    const testUrl = new URL(cleaned, testOrigin);

    if (testUrl.origin !== testOrigin) {
      return fallback;
    }

    // Return normalized path (resolves ../ traversal)
    return testUrl.pathname + testUrl.search + testUrl.hash;
  } catch {
    return fallback;
  }
}

/**
 * Get a secure origin for redirects.
 * Validates x-forwarded-host against allowlist instead of trusting blindly.
 */
function getSecureOrigin(
  requestOrigin: string,
  forwardedHost: string | null,
  isLocal: boolean
): string {
  if (isLocal) return requestOrigin;

  if (forwardedHost) {
    const host = forwardedHost.split(",")[0].trim().toLowerCase();

    if (ALLOWED_HOSTS.has(host)) {
      return `https://${host}`;
    }

    console.warn(
      `[SECURITY] Rejected unknown x-forwarded-host: ${forwardedHost}`
    );
  }

  return requestOrigin;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  const next = sanitizeRedirectPath(searchParams.get("next"));

  if (code) {
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

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocal = process.env.NODE_ENV === "development";
      const origin = getSecureOrigin(
        request.nextUrl.origin,
        forwardedHost,
        isLocal
      );

      const redirectUrl = new URL(`/en${next}`, origin);
      const response = NextResponse.redirect(redirectUrl);

      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options as Record<string, string>);
      });

      return response;
    }
  }

  // Error — redirect to login
  const origin = request.nextUrl.origin;
  return NextResponse.redirect(new URL("/en/login", origin));
}
