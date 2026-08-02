import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The VAPID public key the browser needs to create a subscription. Public by
// design: it is the half of the pair that is meant to be handed out. Returns
// enabled:false when no key is configured, so the client can stay quiet
// instead of prompting for a permission it cannot use.
export async function GET() {
  const { pushEnabled, publicKey } = await import("@/lib/push");
  return NextResponse.json(
    { enabled: pushEnabled(), key: pushEnabled() ? publicKey() : null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
