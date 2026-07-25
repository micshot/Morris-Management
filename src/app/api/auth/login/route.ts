import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Realtor login. Verifies email + password against the Agent record (scoped to
// the current agency) and sets a signed httpOnly session cookie.
export async function POST(req: NextRequest) {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const { createSession, SESSION_COOKIE } = await import("@/lib/auth");
  const bcrypt = (await import("bcryptjs")).default;

  let body: { email?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const agencyId = await getCurrentAgencyId();
  const agent = await prisma.agent.findFirst({
    where: { agencyId, email },
  });

  // Generic error either way — never reveal whether the email exists.
  if (!agent || !agent.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await bcrypt.compare(password, agent.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await createSession({
    agentId: agent.id,
    agencyId: agent.agencyId,
    role: agent.role,
    name: agent.name,
  });

  const res = NextResponse.json({ ok: true, name: agent.name });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
