import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// In-person viewings. Realtor-only in both directions: the AI never creates
// these, and they expose lead contact data.
export async function GET() {
  const { getSession } = await import("@/lib/auth");
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();

  const viewings = await prisma.viewing.findMany({
    where: { agencyId },
    orderBy: { startsAt: "asc" },
    include: { person: true, property: true },
    take: 500,
  });
  return NextResponse.json({ viewings });
}

export async function POST(req: NextRequest) {
  const { getSession } = await import("@/lib/auth");
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();

  let body: { personId?: string; propertyId?: string; startsAt?: string; durationMinutes?: number; notes?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.personId) return NextResponse.json({ error: "personId required" }, { status: 400 });
  if (!body.startsAt) return NextResponse.json({ error: "startsAt required" }, { status: 400 });
  const startsAt = new Date(body.startsAt);
  if (isNaN(startsAt.getTime())) return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });

  const person = await prisma.person.findFirst({ where: { id: body.personId, agencyId } });
  if (!person) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const viewing = await prisma.viewing.create({
    data: {
      agencyId,
      personId: person.id,
      propertyId: body.propertyId || null,
      startsAt,
      durationMinutes: body.durationMinutes ?? 30,
      notes: body.notes?.trim() || null,
    },
    include: { property: true },
  });

  await prisma.leadEvent.create({
    data: {
      agencyId,
      personId: person.id,
      type: "viewing",
      detail: `Viewing scheduled${viewing.property?.title ? ` at ${viewing.property.title}` : ""} for ${startsAt.toLocaleString()}`,
    },
  });

  return NextResponse.json({ viewing }, { status: 201 });
}
