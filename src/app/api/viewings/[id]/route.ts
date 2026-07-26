import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const STATUSES = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { getSession } = await import("@/lib/auth");
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();
  const { id } = await params;

  let body: { status?: string; startsAt?: string; notes?: string; propertyId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const existing = await prisma.viewing.findFirst({ where: { id, agencyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status && STATUSES.includes(body.status)) data.status = body.status;
  if (body.startsAt) {
    const d = new Date(body.startsAt);
    if (!isNaN(d.getTime())) data.startsAt = d;
  }
  if (typeof body.notes === "string") data.notes = body.notes.trim() || null;
  if (typeof body.propertyId === "string") data.propertyId = body.propertyId || null;

  const viewing = await prisma.viewing.update({ where: { id: existing.id }, data });

  if (data.status) {
    await prisma.leadEvent.create({
      data: { agencyId, personId: existing.personId, type: "viewing", detail: `Viewing marked ${String(data.status).toLowerCase().replace("_", " ")}` },
    });
  }
  return NextResponse.json({ viewing });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { getSession } = await import("@/lib/auth");
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();
  const { id } = await params;

  const existing = await prisma.viewing.findFirst({ where: { id, agencyId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.viewing.delete({ where: { id: existing.id } });
  return NextResponse.json({ ok: true });
}
