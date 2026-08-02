import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Register or refresh this device's push endpoint for the logged-in realtor.
// Session required: a push endpoint is tied to an identified agent, never to
// an anonymous visitor.
export async function POST(req: NextRequest) {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const endpoint = body.endpoint?.trim();
  const p256dh = body.keys?.p256dh;
  const auth = body.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "Incomplete subscription" }, { status: 400 });
  }

  const { prisma } = await import("@/lib/db");

  // The endpoint is the device identity. Re-subscribing on the same device
  // updates the row rather than piling up duplicates, and re-points it if the
  // device is now used by a different agent.
  const sub = await prisma.pushSubscription.upsert({
    where: { endpoint },
    create: {
      endpoint,
      p256dh,
      auth,
      agentId: session.agentId,
      agencyId: session.agencyId,
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    update: {
      p256dh,
      auth,
      agentId: session.agentId,
      agencyId: session.agencyId,
      userAgent: req.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
    select: { id: true },
  });

  return NextResponse.json({ ok: true, id: sub.id });
}

// Unsubscribe this device. Called when permission is revoked or the realtor
// turns notifications off.
export async function DELETE(req: NextRequest) {
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { endpoint?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.endpoint) return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });

  const { prisma } = await import("@/lib/db");
  await prisma.pushSubscription
    .deleteMany({ where: { endpoint: body.endpoint, agencyId: session.agencyId } })
    .catch(() => undefined);

  return NextResponse.json({ ok: true });
}
