import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// The identity of the running build. Railway injects the commit SHA; if it is
// absent we fall back to the process start time, which changes on every boot.
// Either way the value is stable while the server is up and different after a
// deploy, which is exactly what the client needs to detect staleness.
const BOOT = Date.now().toString(36);

const VERSION =
  process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ||
  process.env.BUILD_ID ||
  `boot-${BOOT}`;

export async function GET() {
  return NextResponse.json(
    { version: VERSION, startedAt: BOOT },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    },
  );
}
