import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const { SESSION_COOKIE } = await import("@/lib/auth");
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return res;
}
