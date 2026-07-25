import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Route protection:
// - Public: "/" landing, "/chat", "/login", and the buyer + auth APIs.
// - Realtor-only: "/dashboard", "/leads", "/bookings", "/properties".
// Non-logged-in visitors to a realtor page are redirected to /login.

const REALTOR_PAGES = ["/dashboard", "/leads", "/bookings", "/properties"];

function secret(): Uint8Array {
  const s =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "dev-only-insecure-secret-change-me";
  return new TextEncoder().encode(s);
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const needsAuth = REALTOR_PAGES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get("mm_session")?.value;
  if (token) {
    try {
      await jwtVerify(token, secret());
      return NextResponse.next();
    } catch {
      // fall through to redirect
    }
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/dashboard/:path*", "/leads/:path*", "/bookings/:path*", "/properties/:path*"],
};
