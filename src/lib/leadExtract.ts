import type Anthropic from "@anthropic-ai/sdk";

// Extracts the nine qualification fields + temperature from a buyer conversation.
// Runs as a separate structured pass so the buyer-facing reply stays natural.

export type ExtractedLead = {
  name: string | null;
  phone: string | null;
  email: string | null;
  preferredChannel: string | null;
  role: "BUYER" | "SELLER" | "RENTER" | "INVESTOR" | "UNKNOWN";
  propertyType: string | null;
  location: string | null;
  budget: string | null;
  financingStatus: string | null;
  timeline: string | null;
  source: string | null;
  temperature: "HOT" | "WARM" | "COLD" | "UNSET";
};

const EXTRACTION_SYSTEM = `You extract structured lead data from a real estate buyer conversation.
Return ONLY a JSON object, no prose, no markdown fences, with exactly these keys:
name, phone, email, preferredChannel, role, propertyType, location, budget, financingStatus, timeline, source, temperature

Rules:
- Use null for anything not stated or not reasonably inferable. Never invent contact details.
- role: one of BUYER, SELLER, RENTER, INVESTOR, UNKNOWN.
- temperature: HOT if they gave contact info or asked to speak to an agent / book a call or showed strong specific intent; WARM if actively engaged with specifics (budget, area, timeline); COLD if vague or just browsing; UNSET if there is nothing to judge.
- budget/timeline/financingStatus: short free text as stated (e.g. "2.1M NIS", "within 3 months", "pre-approved").
- source: how they arrived if stated, else null.`;

export async function extractLead(
  anthropic: Anthropic,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<ExtractedLead | null> {
  const transcript = messages
    .map((m) => `${m.role === "user" ? "Buyer" : "Assistant"}: ${m.content}`)
    .join("\n");

  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 512,
      system: EXTRACTION_SYSTEM,
      messages: [{ role: "user", content: `Conversation:\n${transcript}\n\nReturn the JSON.` }],
    });

    const text = res.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("")
      .trim()
      .replace(/^```json?/i, "")
      .replace(/```$/, "")
      .trim();

    const parsed = JSON.parse(text) as ExtractedLead;

    // Normalise enums defensively.
    const roles = ["BUYER", "SELLER", "RENTER", "INVESTOR", "UNKNOWN"];
    const temps = ["HOT", "WARM", "COLD", "UNSET"];
    if (!roles.includes(parsed.role)) parsed.role = "UNKNOWN";
    if (!temps.includes(parsed.temperature)) parsed.temperature = "UNSET";

    return parsed;
  } catch {
    // Extraction is best-effort; never break the buyer chat over it.
    return null;
  }
}
