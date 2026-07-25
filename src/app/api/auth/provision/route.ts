import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// One-time realtor provisioning. Protected by SETUP_SECRET so only someone with
// the env secret can create a login. Creates or updates an Agent with a password.
// Call once to bootstrap the first realtor, then it can be ignored.
export async function POST(req: NextRequest) {
  const setup = process.env.SETUP_SECRET;
  if (!setup) {
    return NextResponse.json({ error: "SETUP_SECRET not configured" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const bcrypt = (await import("bcryptjs")).default;

  let body: { secret?: string; name?: string; email?: string; password?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.secret !== setup) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const password = body.password ?? "";
  if (!name || !email || password.length < 8) {
    return NextResponse.json(
      { error: "name, email, and password (min 8 chars) required" },
      { status: 400 }
    );
  }

  const agencyId = await getCurrentAgencyId();
  const passwordHash = await bcrypt.hash(password, 10);
  const role = body.role === "AGENT" ? "AGENT" : "ADMIN";

  const agent = await prisma.agent.upsert({
    where: { agencyId_email: { agencyId, email } },
    update: { name, passwordHash, role },
    create: { agencyId, name, email, passwordHash, role },
  });

  return NextResponse.json({ ok: true, agentId: agent.id, email: agent.email });
}
