import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lists captured leads (people) for the current agency, newest first.
// Realtor-only: exposes private lead data, so it requires a valid session.
export async function GET() {
  const { getSession } = await import("@/lib/auth");
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();

  const people = await prisma.person.findMany({
    where: { agencyId },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });
  return NextResponse.json({ people });
}

// Manually create a lead (realtor-only).
export async function POST(req: NextRequest) {
  const { getSession } = await import("@/lib/auth");
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();

  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);

  const person = await prisma.person.create({
    data: {
      agencyId,
      name: str(body.name) ?? "New lead",
      phone: str(body.phone),
      email: str(body.email),
      location: str(body.location),
      source: str(body.source) ?? "manual",
    },
  });
  return NextResponse.json({ person }, { status: 201 });
}
