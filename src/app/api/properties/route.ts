import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// List properties for the current agency, with their images.
export async function GET() {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();
  const properties = await prisma.property.findMany({
    where: { agencyId },
    orderBy: { updatedAt: "desc" },
    include: { images: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json({ properties });
}

// Create a property. Always DRAFT until an agent reviews it. Optionally accepts
// images (data URLs) captured during upload/extraction. Realtor-only.
export async function POST(req: NextRequest) {
  const { getSession } = await import("@/lib/auth");
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
  const title = str(body.title);
  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

  const images = Array.isArray(body.images) ? body.images : [];
  const imageData = images
    .filter((i): i is { url: string; label?: string; kind?: string } => !!i && typeof i.url === "string")
    .slice(0, 20)
    .map((i) => ({ url: i.url, label: i.label ?? null, kind: i.kind === "floorplan" ? "floorplan" : "photo" }));

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
      images: imageData.length ? { create: imageData } : undefined,
    },
    include: { images: true },
  });

  return NextResponse.json({ property }, { status: 201 });
}
