import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Update a booking's status (confirm/cancel) or time. Realtor-only.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { getSession } = await import("@/lib/auth");
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();
  const { id } = await params;

  let body: { status?: string; startsAt?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const existing = await prisma.booking.findFirst({ where: { id, agencyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (["REQUESTED", "CONFIRMED", "CANCELLED"].includes(body.status ?? "")) data.status = body.status;
  if (body.startsAt) {
    const d = new Date(body.startsAt);
    if (!isNaN(d.getTime())) data.startsAt = d;
  }

  const booking = await prisma.booking.update({ where: { id: existing.id }, data });
  return NextResponse.json({ booking });
}
