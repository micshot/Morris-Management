import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Accepts an uploaded listing sheet (PDF) or image (photo/floor plan), runs it
// through Claude vision, and returns extracted property fields for the agent to
// review before saving. Realtor-only.
export async function POST(req: NextRequest) {
  const { getSession } = await import("@/lib/auth");
  if (!(await getSession())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const Anthropic = (await import("@anthropic-ai/sdk")).default;

  let body: { dataUrl?: string; mediaType?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const dataUrl = body.dataUrl ?? "";
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "Expected a base64 data URL" }, { status: 400 });
  const mediaType = m[1];
  const base64 = m[2];

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const instruction = `Extract real estate listing details from this document/image. Return ONLY JSON, no prose, no fences, with keys: title, location, price, rooms, sizeSqm, description. Use null for anything not present. "rooms" and "sizeSqm" as plain numbers/strings. "price" as shown. Keep description under 400 chars, factual, from the document only.`;

  const isPdf = mediaType === "application/pdf";
  const contentBlock = isPdf
    ? { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 } }
    : { type: "image" as const, source: { type: "base64" as const, media_type: mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64 } };

  try {
    const res = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 700,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: instruction }] }],
    });
    const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim()
      .replace(/^```json?/i, "").replace(/```$/, "").trim();
    const fields = JSON.parse(text);
    return NextResponse.json({ fields });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Extraction failed" },
      { status: 502 }
    );
  }
}
