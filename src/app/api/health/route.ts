import { NextResponse } from "next/server";

// Lightweight liveness check. Does not touch the DB so it always answers
// fast for Railway's healthcheck even if the DB is still connecting.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "morris-management",
    version: "0.1.0",
    time: new Date().toISOString(),
  });
}
