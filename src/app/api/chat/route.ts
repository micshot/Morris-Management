import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Web chat front door. Delegates to the shared conversation engine.
export async function POST(req: NextRequest) {
  const { runConversation } = await import("@/lib/engine");

  let body: {
    messages?: { role: "user" | "assistant"; content: string }[];
    conversationId?: string;
    source?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const conversationId = typeof body.conversationId === "string" ? body.conversationId : null;
  const source = typeof body.source === "string" ? body.source : "web-chat";

  const result = await runConversation(messages, conversationId, source);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ reply: result.reply });
}
