import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Channel-agnostic inbound message ingest. Any front door (WhatsApp Business
// API, SMS, web form) posts a normalised message here and gets the assistant's
// reply, using the SAME engine and lead capture as the web chat. The channel
// provides a stable per-person key (e.g. phone number) used as conversationId.
//
// Provider-specific verification/signature handling is layered on per channel
// when its credentials are configured; this is the shared core.
export async function POST(req: NextRequest) {
  let body: {
    channel?: string;
    from?: string; // stable sender id for the channel (phone, etc.)
    text?: string;
    history?: { role: "user" | "assistant"; content: string }[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const channel = (body.channel ?? "external").toLowerCase();
  const from = (body.from ?? "").trim();
  const text = (body.text ?? "").trim();
  if (!from || !text) {
    return NextResponse.json({ error: "from and text required" }, { status: 400 });
  }

  // Deterministic conversation id per channel+sender so the same person maps to
  // one lead across messages.
  const conversationId = `${channel}:${from}`;
  const history = Array.isArray(body.history) ? body.history : [];
  const messages = [...history, { role: "user" as const, content: text }];

  // Reuse the web chat engine by calling it internally.
  const origin = req.nextUrl.origin;
  const res = await fetch(`${origin}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, conversationId, source: channel }),
  });
  const data = await res.json();

  return NextResponse.json({ reply: data.reply ?? null, conversationId });
}
