import { NextResponse } from "next/server";

// Verifies the app can reach Postgres. Separate from /api/health so a DB
// problem never fails the liveness check that keeps the container up.
// Prisma is imported lazily inside the handler so it is never evaluated at
// build time (when the engine binary or DATABASE_URL may not be present).
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");
    await prisma.$queryRaw`SELECT 1`;
    const agencies = await prisma.agency.count();
    return NextResponse.json({ status: "ok", db: "connected", agencies });
  } catch (err) {
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        message: err instanceof Error ? err.message : String(err),
      },
      { status: 503 }
    );
  }
}
