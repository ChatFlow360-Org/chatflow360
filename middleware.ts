import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Routes that don't require authentication (without locale prefix)
const publicRoutes = ["/login", "/signup", "/forgot-password", "/update-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix for route matching (e.g., /en/login → /login)
  const pathnameWithoutLocale = pathname.replace(/^\/(en|es)/, "") || "/";

  const isPublicRoute = publicRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // --- Step 1: Create Supabase client, store pending cookies ---
  const supabaseCookies: Array<{
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
          supabaseCookies.push(...cookies);
          // Also set on request so intlMiddleware sees refreshed tokens
          cookies.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
        },
      },
    }
  );

  // --- Step 2: Verify auth (getUser validates against server) ---
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Step 3: Auth redirects ---
  if (!isPublicRoute && !user) {
    // Unauthenticated → redirect to login
    const locale = pathname.match(/^\/(en|es)/)?.[1] || "en";
    const loginUrl = new URL(`/${locale}/login`, request.url);
    const response = NextResponse.redirect(loginUrl);
    supabaseCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Record<string, string>);
    });
    return response;
  }

  if (isPublicRoute && user) {
    // Already authenticated → redirect to dashboard
    const locale = pathname.match(/^\/(en|es)/)?.[1] || "en";
    const dashboardUrl = new URL(`/${locale}/`, request.url);
    const response = NextResponse.redirect(dashboardUrl);
    supabaseCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options as Record<string, string>);
    });
    return response;
  }

  // --- Step 4: Run intl middleware ---
  const intlResponse = intlMiddleware(request);

  // --- Step 5: Copy Supabase cookies onto intl response ---
  supabaseCookies.forEach(({ name, value, options }) => {
    intlResponse.cookies.set(name, value, options as Record<string, string>);
  });

  return intlResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
