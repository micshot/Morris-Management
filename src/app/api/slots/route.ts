import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Suggests intro-call slots for the next several days. Business hours 09:00-17:00
// local, on the hour, excluding already-booked times. When real calendar sync
// (Google/Outlook) is added, this reads the agent's true availability instead.
export async function GET() {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const agencyId = await getCurrentAgencyId();

  const taken = await prisma.booking.findMany({
    where: { agencyId, status: { not: "CANCELLED" } },
    select: { startsAt: true },
  });
  const takenSet = new Set(taken.map((t: (typeof taken)[number]) => t.startsAt.toISOString()));

  const slots: string[] = [];
  const now = new Date();
  const cursor = new Date(now);
  cursor.setMinutes(0, 0, 0);
  cursor.setHours(cursor.getHours() + 1);

  let guard = 0;
  while (slots.length < 12 && guard < 500) {
    guard++;
    const day = cursor.getDay();
    const hour = cursor.getHours();
    const isBusiness = day >= 0 && day <= 6 && hour >= 9 && hour <= 17;
    if (isBusiness && !takenSet.has(cursor.toISOString())) {
      slots.push(cursor.toISOString());
    }
    cursor.setHours(cursor.getHours() + 1);
  }

  return NextResponse.json({ slots });
}
