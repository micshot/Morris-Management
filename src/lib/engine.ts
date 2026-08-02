// Shared conversation engine. Both the web chat (/api/chat) and channel-agnostic
// inbound webhook (/api/inbound) call this directly, so there is exactly ONE
// engine and ONE lead-capture path regardless of the front door.

type Msg = { role: "user" | "assistant"; content: string };

export async function runConversation(
  messages: Msg[],
  conversationId: string | null,
  source: string,
  originIp?: string | null
): Promise<{ reply: string } | { error: string; status: number }> {
  const { prisma } = await import("@/lib/db");
  const { getCurrentAgencyId } = await import("@/lib/tenant");
  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const { extractLead } = await import("@/lib/leadExtract");

  if (messages.length === 0) return { error: "No messages", status: 400 };

  const agencyId = await getCurrentAgencyId();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  // Returning-user verification gate.
  let verificationNote = "";
  if (conversationId) {
    try {
      const { findReturningCandidate, verifyClaim } = await import("@/lib/verification");
      const claim = await extractLead(anthropic, messages);
      if (claim && (claim.phone || claim.email)) {
        const candidate = await findReturningCandidate(prisma, agencyId, conversationId, {
          name: claim.name,
          phone: claim.phone,
          email: claim.email,
        });
        if (candidate) {
          const outcome = await verifyClaim(prisma, candidate.id, {
            name: claim.name,
            phone: claim.phone,
            email: claim.email,
            detail: claim.location,
          });
          if (outcome.status === "challenge") {
            verificationNote =
              "\n\nIMPORTANT: This person may be a returning contact. Do NOT reveal or confirm any previously stored details about them. Politely ask them to confirm their full name AND one detail from a prior conversation before continuing as if you know them. Stay neutral and friendly.";
          } else if (outcome.status === "failed_open") {
            verificationNote =
              "\n\nIMPORTANT: Treat this as a brand-new inquiry. Do NOT reference or confirm any previously stored details. Help them fresh as a new buyer.";
          }
        }
      }
    } catch {
      /* best-effort */
    }
  }

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
- Learn what they want: area, budget, timeline, property type.
- Getting their NAME and PHONE NUMBER is your priority once they show real interest. Ask for them directly but warmly, and explain why: so an agent can follow up properly. Email is optional - only ask if they say they prefer email or decline to give a phone number.
- If they deflect on contact details, keep helping and ask again naturally a little later. Do not badger them on consecutive messages, and never refuse to help someone who won't share details.
- Be warm, concise, and helpful. Move a genuinely interested buyer toward booking a short intro call with the agent.

Available properties (these are the only ones you may discuss):
${propertyContext}${verificationNote}`;

  let text: string;
  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });
    text = response.content.map((b) => (b.type === "text" ? b.text : "")).join("\n");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "AI error", status: 502 };
  }

  // Notify the desk without ever blocking or breaking the buyer conversation.
  // No PII in the payload: the push service is a third party.
  const notify = (title: string, body: string, url: string, tag: string) => {
    void (async () => {
      try {
        const { pushToAgency } = await import("@/lib/push");
        await pushToAgency(agencyId, { title, body, url, tag });
      } catch {
        /* push is never allowed to affect the conversation */
      }
    })();
  };

  // Lead capture (best-effort).
  if (conversationId) {
    const full = [...messages, { role: "assistant" as const, content: text }];
    try {
      const lead = await extractLead(anthropic, full);
      if (lead) {
        const existing = await prisma.person.findFirst({ where: { agencyId, conversationId } });
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
          source: lead.source ?? existing?.source ?? source,
          temperature: lead.temperature,
          lastIp: originIp ?? existing?.lastIp ?? null,
          lastSeenAt: new Date(),
          messageCount: (existing?.messageCount ?? 0) + 1,
        };
        if (existing) {
          await prisma.person.update({ where: { id: existing.id }, data });
          // Log meaningful changes to the lead's history.
          const changes: string[] = [];
          for (const k of ["name","phone","email","location","budget","timeline","temperature"] as const) {
            const before = (existing as Record<string, unknown>)[k];
            const after = (data as Record<string, unknown>)[k];
            if (after && after !== before) changes.push(`${k}: ${String(after)}`);
          }
          if (changes.length > 0) {
            await prisma.leadEvent.create({
              data: { agencyId, personId: existing.id, type: "updated", detail: `AI learned - ${changes.join(", ")}` },
            });
          }
          if (lead.summary) {
            await prisma.leadEvent.create({
              data: { agencyId, personId: existing.id, type: "discussed", detail: lead.summary },
            });
          }
          // Fires on the transition only, so a lead that stays hot across a
          // long conversation does not buzz the desk on every message.
          if (data.temperature === "HOT" && existing.temperature !== "HOT") {
            notify(
              "Hot lead",
              data.name ? `${data.name} is ready to talk.` : "A buyer is ready to talk.",
              `/leads?id=${existing.id}`,
              `lead-${existing.id}`,
            );
          }
        } else {
          const created = await prisma.person.create({ data: { agencyId, conversationId, ...data } });
          await prisma.leadEvent.create({
            data: { agencyId, personId: created.id, type: "captured", detail: `Captured from ${source}${data.name ? ` as ${data.name}` : ""}` },
          });
          if (lead.summary) {
            await prisma.leadEvent.create({
              data: { agencyId, personId: created.id, type: "discussed", detail: lead.summary },
            });
          }
          if (data.temperature === "HOT") {
            notify(
              "Hot lead",
              data.name ? `${data.name} is ready to talk.` : "A buyer is ready to talk.",
              `/leads?id=${created.id}`,
              `lead-${created.id}`,
            );
          }
        }
      }
    } catch {
      /* best-effort */
    }
  }

  return { reply: text };
}
