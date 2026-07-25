import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// The AI conversation engine. Grounded ONLY in LIVE (agent-reviewed) properties.
// After replying, it captures/updates a lead record for this conversation.
export async function POST(req: NextRequest) {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const { extractLead } = await import("@/lib/leadExtract");

  let body: {
    messages?: { role: "user" | "assistant"; content: string }[];
    conversationId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const conversationId =
    typeof body.conversationId === "string" ? body.conversationId : null;
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  const agencyId = await getCurrentAgencyId();

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
- Naturally try to learn who you're speaking with: what they're looking for, their area, budget, timeline, and how to reach them - but do not interrogate. Let it come out through helpful conversation.
- Be warm, concise, and helpful. Move a genuinely interested buyer toward booking a short intro call with the agent.

Available properties (these are the only ones you may discuss):
${propertyContext}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  let text: string;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    text = response.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI error" },
      { status: 502 }
    );
  }

  // Lead capture (best-effort; awaited so it completes in serverless, but
  // wrapped so it can never break or delay-fail the reply).
  if (conversationId) {
    const full = [...messages, { role: "assistant" as const, content: text }];
    try {
      const lead = await extractLead(anthropic, full);
      if (lead) {
        const existing = await prisma.person.findFirst({
          where: { agencyId, conversationId },
        });
        const data = {
          name: lead.name ?? existing?.name ?? null,
          phone: lead.phone ?? existing?.phone ?? null,
          email: lead.email ?? existing?.email ?? null,
          preferredChannel: lead.preferredChannel ?? existing?.preferredChannel ?? null,
          role: lead.role,
          propertyType: lead.propertyType ?? existing?.propertyType ?? null,
          location: lead.location ?? existing?.location ?? null,
          budget: lead.budget ?? existing?.budget ?? null,
          financingStatus: lead.financingStatus ?? existing?.financingStatus ?? null,
          timeline: lead.timeline ?? existing?.timeline ?? null,
          source: lead.source ?? existing?.source ?? "web-chat",
          temperature: lead.temperature,
        };
        if (existing) {
          await prisma.person.update({ where: { id: existing.id }, data });
        } else {
          await prisma.person.create({ data: { agencyId, conversationId, ...data } });
        }
      }
    } catch {
      // best-effort; never surface to the buyer
    }
  }

  return NextResponse.json({ reply: text });
}
