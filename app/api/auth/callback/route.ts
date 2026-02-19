import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");

  // Sanitize redirect: must be a relative path, no protocol or double slashes
  let next = searchParams.get("next") ?? "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    next = "/";
  }

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
      const origin = isLocal
        ? request.nextUrl.origin
        : forwardedHost
          ? `https://${forwardedHost}`
          : request.nextUrl.origin;

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
