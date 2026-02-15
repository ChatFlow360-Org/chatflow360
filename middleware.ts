import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

const intlMiddleware = createMiddleware(routing);

// Routes that don't require authentication
const publicRoutes = ["/login", "/signup", "/forgot-password"];

export default function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Strip locale prefix for route matching (e.g., /en/login → /login)
  const pathnameWithoutLocale = pathname.replace(/^\/(en|es)/, "") || "/";

  // Skip auth check for public routes
  const isPublicRoute = publicRoutes.some((route) =>
    pathnameWithoutLocale.startsWith(route)
  );

  // TODO: Implement Supabase Auth check when backend is ready
  // if (!isPublicRoute) {
  //   const session = await getSession(request);
  //   if (!session) {
  //     return NextResponse.redirect(new URL("/login", request.url));
  //   }
  // }

  // Run i18n middleware for locale routing
  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
