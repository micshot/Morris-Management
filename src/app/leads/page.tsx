"use client";

import { useEffect, useState } from "react";

type Person = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  preferredChannel: string | null;
  role: string;
  propertyType: string | null;
  location: string | null;
  budget: string | null;
  financingStatus: string | null;
  timeline: string | null;
  source: string | null;
  temperature: "HOT" | "WARM" | "COLD" | "UNSET";
  updatedAt: string;
};

const FOREST = "#1B3A2F";
const GOLD = "#A88532";
const SAGE = "#6B7A70";
const LINE = "#D6DDD4";

const tempColor: Record<string, { fg: string; bg: string }> = {
  HOT: { fg: "#b91c1c", bg: "#fbe6e6" },
  WARM: { fg: "#b45309", bg: "#fbeed6" },
  COLD: { fg: "#1e5f8c", bg: "#e4eef6" },
  UNSET: { fg: SAGE, bg: "#eef1ee" },
};

export default function LeadsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      setPeople(data.people ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const order = { HOT: 0, WARM: 1, COLD: 2, UNSET: 3 } as const;
  const sorted = [...people].sort(
    (a, b) => order[a.temperature] - order[b.temperature]
  );

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <div style={{ borderBottom: `2px solid ${GOLD}`, paddingBottom: 12, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1 style={{ color: FOREST, fontSize: 26, fontWeight: 800, margin: 0 }}>Leads</h1>
          <p style={{ color: SAGE, fontSize: 13, margin: "4px 0 0" }}>
            Captured from conversations. Hottest first.
          </p>
        </div>
        <button
          onClick={load}
          style={{ background: "transparent", color: FOREST, border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <p style={{ color: SAGE }}>Loading…</p>
      ) : sorted.length === 0 ? (
        <p style={{ color: SAGE }}>No leads yet. They appear here as buyers chat.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {sorted.map((p) => {
            const c = tempColor[p.temperature] ?? tempColor.UNSET;
            const facts = [
              p.role !== "UNKNOWN" ? p.role : null,
              p.location,
              p.propertyType,
              p.budget && `budget ${p.budget}`,
              p.timeline && `timeline ${p.timeline}`,
              p.financingStatus && `financing ${p.financingStatus}`,
            ].filter(Boolean);
            const contact = [
              p.phone,
              p.email,
              p.preferredChannel && `prefers ${p.preferredChannel}`,
            ].filter(Boolean);
            return (
              <div key={p.id} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <strong style={{ color: FOREST, fontSize: 15 }}>{p.name ?? "Unnamed lead"}</strong>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: c.fg, background: c.bg }}>
                    {p.temperature}
                  </span>
                  {p.source && (
                    <span style={{ fontSize: 11, color: SAGE }}>· {p.source}</span>
                  )}
                </div>
                {contact.length > 0 && (
                  <div style={{ color: FOREST, fontSize: 13, marginBottom: 3 }}>{contact.join("  ·  ")}</div>
                )}
                {facts.length > 0 && (
                  <div style={{ color: SAGE, fontSize: 13 }}>{facts.join("  ·  ")}</div>
                )}
                {contact.length === 0 && facts.length === 0 && (
                  <div style={{ color: SAGE, fontSize: 13 }}>No details captured yet.</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
