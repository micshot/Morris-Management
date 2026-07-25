import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Update a property. Currently used for the review gate: DRAFT -> LIVE.
// Scoped to the current agency so one agency can never touch another's data.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const existing = await prisma.property.findFirst({ where: { id, agencyId } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Record<string, unknown> = {};
  if (body.reviewStatus === "LIVE" || body.reviewStatus === "DRAFT") {
    data.reviewStatus = body.reviewStatus;
  }

  const property = await prisma.property.update({
    where: { id: existing.id },
    data,
  });

  return NextResponse.json({ property });
}
