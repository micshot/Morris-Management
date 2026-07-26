const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  PageBreak, LevelFormat, TableOfContents,
} = require("docx");
const fs = require("fs");

const INK = "1B3A2F", GOLD = "A88532", SLATE = "24443A", MUTE = "6B7A70";
const LETTER = { width: 12240, height: 15840 };

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: opts.after ?? 120, line: 276 },
  alignment: opts.align,
  children: [new TextRun({ text, font: "Arial", size: opts.size ?? 21, color: opts.color ?? "1A201D", bold: opts.bold, italics: opts.italics })],
});

const H = (text, level) => new Paragraph({
  heading: level,
  spacing: { before: level === HeadingLevel.HEADING_1 ? 320 : 240, after: 140 },
  children: [new TextRun({ text, font: "Arial", bold: true, color: level === HeadingLevel.HEADING_1 ? INK : SLATE, size: level === HeadingLevel.HEADING_1 ? 30 : 24 })],
});

const EYEBROW = (text) => new Paragraph({
  spacing: { after: 60 },
  children: [new TextRun({ text: text.toUpperCase(), font: "Arial", bold: true, size: 16, color: GOLD, characterSpacing: 40 })],
});

const BULLETS = (items) => items.map((t) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80, line: 276 },
  children: [new TextRun({ text: t, font: "Arial", size: 21, color: "1A201D" })],
}));

const cell = (text, { bold = false, bg, width, color } = {}) => new TableCell({
  width: { size: width, type: WidthType.DXA },
  shading: bg ? { type: ShadingType.CLEAR, fill: bg, color: "auto" } : undefined,
  margins: { top: 90, bottom: 90, left: 120, right: 120 },
  children: [new Paragraph({ children: [new TextRun({ text, font: "Arial", size: 19, bold, color: color ?? "1A201D" })] })],
});

function table(headers, rows, widths) {
  return new Table({
    columnWidths: widths,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 2, color: "D6DDD4" },
      bottom: { style: BorderStyle.SINGLE, size: 2, color: "D6DDD4" },
      left: { style: BorderStyle.SINGLE, size: 2, color: "D6DDD4" },
      right: { style: BorderStyle.SINGLE, size: 2, color: "D6DDD4" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E3DDD0" },
      insideVertical: { style: BorderStyle.SINGLE, size: 2, color: "E3DDD0" },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) => cell(h, { bold: true, bg: INK, width: widths[i], color: "F7F5EF" })),
      }),
      ...rows.map((r) => new TableRow({ children: r.map((c, i) => cell(c, { width: widths[i] })) })),
    ],
  });
}

const RULE = new Paragraph({
  spacing: { before: 60, after: 200 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
  children: [new TextRun({ text: "" })],
});

const doc = new Document({
  numbering: {
    config: [{
      reference: "bullets",
      levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 220 } } } }],
    }],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 21 } } },
  },
  sections: [{
    properties: { page: { size: LETTER, margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
    children: [
      // ---------- COVER ----------
      new Paragraph({ spacing: { before: 1800, after: 0 }, children: [new TextRun({ text: "MORRIS MANAGEMENT", font: "Arial", bold: true, size: 52, color: INK })] }),
      new Paragraph({ spacing: { after: 200 }, border: { bottom: { style: BorderStyle.SINGLE, size: 18, color: GOLD } }, children: [new TextRun({ text: "" })] }),
      P("Secure Software Development Lifecycle", { size: 28, color: SLATE }),
      P("Version 0.2 — Pilot Build Record", { size: 22, color: MUTE }),
      P("July 2026", { size: 20, color: MUTE, after: 600 }),
      P("AI-native real estate agency operations platform.", { size: 21, italics: true, color: SLATE }),
      P("Live: management.morris.is", { size: 21, color: SLATE, after: 1400 }),
      P("Prepared for the pilot deployment with a single Israeli agency.", { size: 19, color: MUTE }),
      P("Confidential — internal engineering document.", { size: 19, color: MUTE }),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------- 1. PURPOSE ----------
      EYEBROW("Section 1"),
      H("Purpose and Scope", HeadingLevel.HEADING_1),
      RULE,
      P("Morris Management is an AI-native, real-estate-native operations platform. It runs one continuous workflow from first buyer contact through to a booked conversation with an agent: outreach, AI qualification, lead capture and scoring, listing management, and scheduling."),
      P("This document records how the system is built, what security decisions were made and why, and what remains open. It is a working engineering record, not a marketing artifact. Version 0.2 replaces v0.1 and reflects the system as actually deployed."),
      H("What changed since v0.1", HeadingLevel.HEADING_2),
      ...BULLETS([
        "The platform moved from specification to a live deployment at management.morris.is.",
        "Realtor authentication, session handling, and route gating are implemented and enforced.",
        "The conversation engine was extracted into a single shared module so every front door behaves identically.",
        "Lead capture, returning-user verification, scheduling, and a full agent workspace are operational.",
        "Property intake now accepts PDFs and images with AI field extraction.",
        "An immutable lead event timeline was added for auditability.",
      ]),
      H("Explicitly out of scope", HeadingLevel.HEADING_2),
      P("The financial module is output-only: it produces records for an accountant. The platform is not an accounting system of record and does not file taxes, which keeps it clear of that regulatory burden. The AI never negotiates, quotes deal terms, or discusses financing specifics; those are deflected to the agent by design."),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------- 2. ARCHITECTURE ----------
      EYEBROW("Section 2"),
      H("Architecture", HeadingLevel.HEADING_1),
      RULE,
      H("Runtime stack", HeadingLevel.HEADING_2),
      table(
        ["Layer", "Technology", "Notes"],
        [
          ["Framework", "Next.js 16.2.11 (Turbopack)", "App Router; proxy.ts for route gating"],
          ["UI", "React 19.2.8", "Server components with client islands"],
          ["Language", "TypeScript 5.9.3", "Strict mode; build fails on type errors"],
          ["ORM", "Prisma 7.9.0", "pg driver adapter; url in prisma.config.ts"],
          ["Database", "PostgreSQL", "Railway-managed, persistent volume"],
          ["AI", "claude-sonnet-5", "Conversation, extraction, document vision"],
          ["Auth", "jose (JWT) + bcryptjs", "HS256, httpOnly cookie, 7-day expiry"],
          ["Hosting", "Railway", "GitHub auto-deploy from main"],
        ],
        [2200, 3200, 3960]
      ),
      P("", { after: 200 }),
      H("One engine, many front doors", HeadingLevel.HEADING_2),
      P("The central design decision: all buyer conversation flows through a single module, src/lib/engine.ts. The web chat and the channel-agnostic inbound webhook both call runConversation() directly as a function, not over HTTP."),
      P("This matters for security and correctness. Grounding rules, negotiation deflection, the verification gate, and lead capture cannot drift between channels, because there is only one implementation. Adding WhatsApp or SMS adds a translation layer at the edge, never a second engine.", { after: 200 }),
      table(
        ["Front door", "Endpoint", "Status"],
        [
          ["Web chat", "/chat → /api/chat", "Live"],
          ["Embeddable widget", "/api/widget.js (iframe loader)", "Live"],
          ["WhatsApp / SMS / forms", "/api/inbound", "Core live; provider credentials pending"],
        ],
        [2600, 3600, 3160]
      ),
      P("", { after: 200 }),
      H("Multi-tenancy", HeadingLevel.HEADING_2),
      P("Every record hangs off exactly one Agency, which is the tenant boundary. Isolation is enforced in application queries: every read and write is scoped by agencyId. Tenant resolution is centralised in src/lib/tenant.ts, so moving from the single pilot agency to true per-agency authentication changes one file, not every query."),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------- 3. DATA MODEL ----------
      EYEBROW("Section 3"),
      H("Data Model", HeadingLevel.HEADING_1),
      RULE,
      table(
        ["Model", "Purpose", "Sensitivity"],
        [
          ["Agency", "Tenant boundary; root of all isolation", "Low"],
          ["Agent", "Realtor identity and login credentials", "High — password hashes"],
          ["Person", "Lead: contact details and 9 qualification fields", "High — buyer PII"],
          ["Property", "Listing with DRAFT/LIVE review state", "Low"],
          ["PropertyImage", "Photos and floor plans attached to a listing", "Low"],
          ["Booking", "15-minute intro call; calendar sync seam", "Medium — links to PII"],
          ["LeadEvent", "Append-only timeline of lead activity", "Medium — audit trail"],
        ],
        [2200, 4560, 2600]
      ),
      P("", { after: 200 }),
      H("Qualification fields", HeadingLevel.HEADING_2),
      P("The AI extracts nine fields through natural conversation rather than interrogation: name, phone, email, preferred channel, role, property type, location, budget, financing status, and timeline. It also assigns a temperature of HOT, WARM, COLD, or UNSET. HOT requires contact details or an explicit request to speak with an agent."),
      H("Lead event timeline", HeadingLevel.HEADING_2),
      P("Every material action writes an immutable LeadEvent: capture, AI-learned field changes, agent edits, and bookings. Agents see this as a per-lead history. It exists for accountability — when a lead's data changes, there is a record of what changed, when, and whether a human or the AI made the change."),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------- 4. SECURITY ----------
      EYEBROW("Section 4"),
      H("Security Controls", HeadingLevel.HEADING_1),
      RULE,
      H("Authentication and session handling", HeadingLevel.HEADING_2),
      ...BULLETS([
        "Passwords are hashed with bcrypt (cost 10). Plaintext is never stored or logged.",
        "Sessions are HS256-signed JWTs in an httpOnly, secure, sameSite=lax cookie with a 7-day expiry.",
        "Login returns an identical error whether the email is unknown or the password is wrong, so the endpoint cannot be used to enumerate accounts.",
        "Realtor accounts are provisioned through an endpoint gated by SETUP_SECRET. There is no public signup — an attacker cannot self-register into an agency workspace.",
      ]),
      H("Authorization", HeadingLevel.HEADING_2),
      P("Protection is applied at two layers, deliberately. Page routes (/dashboard, /leads, /properties, /calendar, /bookings) are gated in proxy.ts, which redirects unauthenticated visitors to /login. Separately, every API route that returns private data re-checks the session server-side."),
      P("The second layer is the one that matters. Route gating alone would leave the JSON endpoints open to anyone who guessed the URL; the API checks mean buyer PII cannot be read without a valid session regardless of how the request arrives."),
      H("Data exposure boundaries", HeadingLevel.HEADING_2),
      table(
        ["Surface", "Access", "Rationale"],
        [
          ["/chat, /api/chat", "Public", "Buyer-facing; exposes only LIVE listings"],
          ["/api/inbound", "Public", "Channel ingest; same grounding rules"],
          ["/api/slots", "Public", "Times only; no lead data"],
          ["/api/leads (+ /[id])", "Session required", "Buyer PII"],
          ["/api/bookings", "Session required", "Contains lead contact details"],
          ["/api/auth/provision", "SETUP_SECRET", "Creates privileged accounts"],
        ],
        [3000, 2600, 3760]
      ),
      P("", { after: 200 }),
      H("AI-specific controls", HeadingLevel.HEADING_2),
      ...BULLETS([
        "Grounding: the assistant may only discuss properties in the LIVE list injected into its context. Unreviewed DRAFT listings are never visible to buyers.",
        "Review gate: a listing reaches buyers only after an agent promotes it from DRAFT to LIVE. AI-extracted property data always lands as DRAFT.",
        "Deflection: negotiation, financing, and closing terms are routed to a human agent rather than answered.",
        "Extraction is best-effort and isolated: if lead extraction fails, the buyer conversation continues unaffected.",
      ]),
      H("Returning-user verification", HeadingLevel.HEADING_2),
      P("When an inbound message presents a phone number or email matching an existing lead from a different conversation, the assistant must not confirm or reveal anything held on that record until identity is established. Verification requires a name match plus one corroborating detail from a prior conversation."),
      P("After two failed attempts the record is marked FLAGGED, the challenge stops, and the conversation continues as a fresh inquiry with no stored data referenced. Failing open rather than continuing to challenge avoids turning the assistant into an oracle that confirms which details are correct."),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------- 5. WORKSTREAM ----------
      EYEBROW("Section 5"),
      H("Operational Workstream", HeadingLevel.HEADING_1),
      RULE,
      H("Daily — implemented and live", HeadingLevel.HEADING_2),
      table(
        ["Capability", "Detail"],
        [
          ["Buyer conversation", "Grounded in LIVE listings; deflects negotiation"],
          ["Lead capture", "9 fields + temperature; one record per person"],
          ["Verification", "Challenge gate for returning contacts"],
          ["Lead management", "Full edit, notes, manual add, delete, history"],
          ["Listings", "Manual entry plus PDF/image AI extraction; review gate"],
          ["Scheduling", "Buyer self-service booking; agent confirm/cancel"],
          ["Calendar", "Month view of intro calls"],
          ["Agent workspace", "Login-gated dashboard across all objects"],
        ],
        [3000, 6360]
      ),
      P("", { after: 200 }),
      H("Weekly, monthly, quarterly — mapped, not yet defined", HeadingLevel.HEADING_2),
      P("These cadences were identified in v0.1 and remain deliberately undefined. Defining them before the pilot produces real usage data would be guesswork. They are expected to cover pipeline review, listing performance, agent activity reporting, and the accountant-facing financial output."),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------- 6. OPEN ITEMS ----------
      EYEBROW("Section 6"),
      H("Open Items and Known Risks", HeadingLevel.HEADING_1),
      RULE,
      P("Recorded honestly. These are the gaps between the current pilot build and a system carrying real client data at scale."),
      table(
        ["Item", "Risk", "Status"],
        [
          ["Pilot credential strength", "High if real data is loaded", "Test credential in use; must be rotated before real buyer data"],
          ["Schema migrations", "Medium", "Using prisma db push; move to versioned migrations before production data accumulates"],
          ["Rate limiting", "Medium", "Public chat and inbound are unthrottled; exposes AI cost to abuse"],
          ["Calendar sync", "Low", "Model seam exists; Google/Outlook OAuth not wired. Apple not supported by decision"],
          ["WhatsApp go-live", "Low", "Engine proven; requires Meta Business API credentials and a dedicated number"],
          ["Image storage", "Low", "Images stored as data URLs; move to object storage before volume grows"],
          ["Per-agency auth", "Low", "Single pilot tenant; tenant.ts is the single change point"],
        ],
        [2600, 1800, 4960]
      ),
      P("", { after: 240 }),
      H("Build discipline", HeadingLevel.HEADING_2),
      ...BULLETS([
        "TypeScript strict mode is enforced; the deployment fails on type errors rather than shipping them.",
        "Dependencies are held at current stable releases. The platform blocks builds carrying known CVEs.",
        "Every change is committed to version control with a stated rationale and auto-deploys from main.",
        "Prisma access is lazily imported inside handlers so build-time page collection never evaluates database code.",
      ]),
      new Paragraph({ children: [new PageBreak()] }),

      // ---------- 7. CLOSING ----------
      EYEBROW("Section 7"),
      H("Current State", HeadingLevel.HEADING_1),
      RULE,
      P("The full daily loop is operational and verified end to end: a buyer arrives through any front door, the assistant answers from real listings and declines to negotiate, a qualified and scored lead is created, returning contacts are challenged before anything is revealed, the buyer books an intro call, and the agent manages all of it from a single authenticated workspace."),
      P("What remains is not architecture. It is credential wiring for external providers, hardening for scale, and the operational cadences that real pilot usage will define.", { after: 300 }),
      new Paragraph({
        spacing: { before: 200 },
        border: { top: { style: BorderStyle.SINGLE, size: 12, color: GOLD } },
        children: [new TextRun({ text: "" })],
      }),
      P("Morris Management · SSDLC v0.2 · July 2026", { size: 18, color: MUTE, align: AlignmentType.CENTER }),
    ],
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/mnt/user-data/outputs/Morris_Management_SSDLC_v0_2.docx", buf);
  console.log("written");
});
