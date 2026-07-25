import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// List properties for the current agency only.
export async function GET() {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();
  const properties = await prisma.property.findMany({
    where: { agencyId },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ properties });
}

// Create a property. Always starts as DRAFT — an agent must review before it
// goes LIVE and becomes something the AI can quote to buyers.
export async function POST(req: NextRequest) {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const str = (v: unknown) =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;

  const title = str(body.title);
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const property = await prisma.property.create({
    data: {
      agencyId,
      title,
      location: str(body.location),
      price: str(body.price),
      rooms: str(body.rooms),
      sizeSqm: str(body.sizeSqm),
      description: str(body.description),
      reviewStatus: "DRAFT",
    },
  });

  return NextResponse.json({ property }, { status: 201 });
}
