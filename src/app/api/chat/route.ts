import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The AI conversation engine. Grounded ONLY in LIVE (agent-reviewed) properties.
// It answers property facts, deflects negotiation/financing to the agent, and
// never quotes deal terms. This is the same brain every front door will use.
export async function POST(req: NextRequest) {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;

  let body: { messages?: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  const agencyId = await getCurrentAgencyId();

  // Only LIVE properties are visible to the AI — never DRAFT/unreviewed data.
  const properties = await prisma.property.findMany({
    where: { agencyId, reviewStatus: "LIVE" },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  const propertyContext =
    properties.length === 0
      ? "There are currently no available properties in the system."
      : properties
          .map(
            (p: (typeof properties)[number]) =>
              `- ${p.title ?? "Untitled"}${p.location ? `, ${p.location}` : ""}` +
              `${p.price ? `, ${p.price}` : ""}${p.rooms ? `, ${p.rooms} rooms` : ""}` +
              `${p.sizeSqm ? `, ${p.sizeSqm} sqm` : ""}` +
              `${p.description ? `. ${p.description}` : ""}`
          )
          .join("\n");

  const systemPrompt = `You are the assistant for a real estate agency, speaking with a prospective buyer.

Your job:
- Answer questions about available properties using ONLY the property list below. Never invent properties, prices, or details that are not listed.
- If asked about something not in the list, say you don't have that available and offer to connect them with an agent.
- You do NOT negotiate, quote deal terms, discuss financing specifics, or make commitments. For anything about price negotiation, mortgages, financing, or closing terms, say that is best discussed directly with the agent and offer to set up a short intro call.
- Be warm, concise, and helpful. Your goal is to understand what the buyer wants and move a genuinely interested buyer toward booking a short intro call with the agent.

Available properties (these are the only ones you may discuss):
${propertyContext}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .filter(Boolean)
      .join("\n");

    return NextResponse.json({ reply: text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI error" },
      { status: 502 }
    );
  }
}
