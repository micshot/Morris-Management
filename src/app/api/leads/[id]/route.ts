import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function guard() {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  return session;
}

// Update any editable field on a lead (realtor-only).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();
  const { id } = await params;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const existing = await prisma.person.findFirst({ where: { id, agencyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const str = (v: unknown) => (typeof v === "string" ? (v.trim() === "" ? null : v.trim()) : undefined);
  const roles = ["BUYER", "SELLER", "RENTER", "INVESTOR", "UNKNOWN"];
  const temps = ["HOT", "WARM", "COLD", "UNSET"];

  const data: Record<string, unknown> = {};
  for (const k of ["name", "phone", "email", "preferredChannel", "propertyType", "location", "budget", "financingStatus", "timeline", "source", "notes"]) {
    const v = str(body[k]);
    if (v !== undefined) data[k] = v;
  }
  if (typeof body.role === "string" && roles.includes(body.role)) data.role = body.role;
  if (typeof body.temperature === "string" && temps.includes(body.temperature)) data.temperature = body.temperature;

  const person = await prisma.person.update({ where: { id: existing.id }, data });

  const changed = Object.keys(data).filter((k) => (data as Record<string, unknown>)[k] !== (existing as unknown as Record<string, unknown>)[k]);
  if (changed.length > 0) {
    await prisma.leadEvent.create({
      data: { agencyId, personId: existing.id, type: "updated", detail: `Agent edited ${changed.join(", ")}` },
    });
  }
  return NextResponse.json({ person });
}

// Delete a lead (realtor-only).
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await guard())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();
  const { id } = await params;

  const existing = await prisma.person.findFirst({ where: { id, agencyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Refuse while the lead still has a scheduled call. Cascading the delete would
  // silently remove a commitment the agent has in their calendar; make them
  // cancel it explicitly first.
  const upcoming = await prisma.booking.findMany({
    where: { personId: existing.id, status: { not: "CANCELLED" }, startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
  });
  const upcomingViewings = await prisma.viewing.count({
    where: { personId: existing.id, status: "SCHEDULED", startsAt: { gte: new Date() } },
  });
  if (upcomingViewings > 0) {
    return NextResponse.json(
      {
        error: `This lead has ${upcomingViewings} scheduled viewing${upcomingViewings > 1 ? "s" : ""}. Cancel ${upcomingViewings > 1 ? "them" : "it"} on the Calendar before deleting.`,
        blockedBy: "viewings",
        count: upcomingViewings,
      },
      { status: 409 }
    );
  }

  if (upcoming.length > 0) {
    const when = new Date(upcoming[0].startsAt).toLocaleString();
    return NextResponse.json(
      {
        error:
          upcoming.length === 1
            ? `This lead has an intro call booked for ${when}. Cancel it on the Intro Calls page before deleting.`
            : `This lead has ${upcoming.length} upcoming intro calls (next: ${when}). Cancel them on the Intro Calls page before deleting.`,
        blockedBy: "bookings",
        count: upcoming.length,
      },
      { status: 409 }
    );
  }

  await prisma.person.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
