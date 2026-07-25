import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Lists captured leads (people) for the current agency, newest first.
// Realtor-only: exposes private lead data, so it requires a valid session.
export async function GET() {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
