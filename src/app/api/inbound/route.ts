import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Channel-agnostic inbound message ingest. Any front door (WhatsApp Business
// API, SMS, web form) posts a normalised message here and gets the assistant's
// reply, using the SAME engine and lead capture as the web chat. The channel
// provides a stable per-person key (e.g. phone number) used as conversationId.
export async function POST(req: NextRequest) {
  const { runConversation } = await import("@/lib/engine");

  let body: {
    channel?: string;
    from?: string;
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

  const conversationId = `${channel}:${from}`;
  const history = Array.isArray(body.history) ? body.history : [];
  const messages = [...history, { role: "user" as const, content: text }];

  const result = await runConversation(messages, conversationId, channel);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ reply: result.reply, conversationId });
}
