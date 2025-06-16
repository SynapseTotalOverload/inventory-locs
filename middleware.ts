import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  // Allow public and auth routes
  if (request.nextUrl.pathname.startsWith("/auth") || request.nextUrl.pathname.startsWith("/public")) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {},
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (!user.email_confirmed_at) {
    const verifyUrl = new URL("/auth/verify-email", request.url);
    verifyUrl.searchParams.set("redirectedFrom", request.nextUrl.pathname);
    return NextResponse.redirect(verifyUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|favicon.ico).*)"],
};
