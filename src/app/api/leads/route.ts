import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lists captured leads (people) for the current agency, newest first.
export async function GET() {
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
