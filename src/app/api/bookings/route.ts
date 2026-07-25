import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// List bookings for the agency (agent-facing), soonest first.
// Realtor-only: exposes lead contact data, so it requires a valid session.
export async function GET() {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();

  const bookings = await prisma.booking.findMany({
    where: { agencyId },
    orderBy: { startsAt: "asc" },
    include: { person: true, agent: true },
    take: 500,
  });

  return NextResponse.json({ bookings });
}

// Request a 15-minute intro call. Associates the lead (by conversationId or
// personId) with a requested time. Calendar sync is a later, additive step.
export async function POST(req: NextRequest) {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();

  let body: { conversationId?: string; personId?: string; startsAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.startsAt) {
    return NextResponse.json({ error: "startsAt is required" }, { status: 400 });
  }
  const startsAt = new Date(body.startsAt);
  if (isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid startsAt" }, { status: 400 });
  }

  // Resolve the person for this booking.
  let personId = body.personId ?? null;
  if (!personId && body.conversationId) {
    const existing = await prisma.person.findFirst({
      where: { agencyId, conversationId: body.conversationId },
    });
    if (existing) personId = existing.id;
    else {
      const created = await prisma.person.create({
        data: { agencyId, conversationId: body.conversationId, source: "web-chat" },
      });
      personId = created.id;
    }
  }
  if (!personId) {
    return NextResponse.json(
      { error: "personId or conversationId required" },
      { status: 400 }
    );
  }

  const booking = await prisma.booking.create({
    data: { agencyId, personId, startsAt, durationMinutes: 15, status: "REQUESTED" },
  });

  return NextResponse.json({ booking }, { status: 201 });
}
