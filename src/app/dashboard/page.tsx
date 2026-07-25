"use client";

import { useEffect, useState } from "react";

const FOREST = "#1B3A2F";
const GOLD = "#A88532";
const SAGE = "#6B7A70";
const LINE = "#D6DDD4";

type Person = {
  id: string; name: string | null; phone: string | null; email: string | null;
  preferredChannel: string | null; role: string; propertyType: string | null;
  location: string | null; budget: string | null; timeline: string | null;
  financingStatus: string | null; source: string | null;
  temperature: "HOT" | "WARM" | "COLD" | "UNSET";
  verificationState?: string;
};
type Booking = {
  id: string; startsAt: string; durationMinutes: number;
  status: "REQUESTED" | "CONFIRMED" | "CANCELLED";
  person: { name: string | null; phone: string | null; email: string | null } | null;
};
type Property = {
  id: string; title: string | null; location: string | null; price: string | null;
  rooms: string | null; sizeSqm: string | null; reviewStatus: "DRAFT" | "LIVE";
};

const tempColor: Record<string, { fg: string; bg: string }> = {
  HOT: { fg: "#b91c1c", bg: "#fbe6e6" },
  WARM: { fg: "#b45309", bg: "#fbeed6" },
  COLD: { fg: "#1e5f8c", bg: "#e4eef6" },
  UNSET: { fg: SAGE, bg: "#eef1ee" },
};

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "14px 18px", minWidth: 120 }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: FOREST, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: SAGE, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function DashboardPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [l, b, p] = await Promise.all([
        fetch("/api/leads").then((r) => r.json()),
        fetch("/api/bookings").then((r) => r.json()),
        fetch("/api/properties").then((r) => r.json()),
      ]);
      setPeople(l.people ?? []);
      setBookings(b.bookings ?? []);
      setProperties(p.properties ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/chat";
  }

  const order = { HOT: 0, WARM: 1, COLD: 2, UNSET: 3 } as const;
  const sortedLeads = [...people].sort((a, b) => order[a.temperature] - order[b.temperature]);
  const hot = people.filter((p) => p.temperature === "HOT").length;
  const liveProps = properties.filter((p) => p.reviewStatus === "LIVE").length;
  const upcoming = bookings.filter((b) => b.status !== "CANCELLED").length;

  const card: React.CSSProperties = { background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: 12 };

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1.25rem 4rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `2px solid ${GOLD}`, paddingBottom: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ color: FOREST, fontSize: 26, fontWeight: 800, margin: 0 }}>Dashboard</h1>
          <p style={{ color: SAGE, fontSize: 13, margin: "4px 0 0" }}>Leads, calls, and listings in one view.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={load} style={{ background: "transparent", color: FOREST, border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>Refresh</button>
          <button onClick={logout} style={{ background: "transparent", color: SAGE, border: `1px solid ${LINE}`, borderRadius: 6, padding: "6px 12px", fontSize: 13, cursor: "pointer" }}>Sign out</button>
        </div>
      </div>

      {loading ? (
        <p style={{ color: SAGE }}>Loading…</p>
      ) : (
        <>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 28 }}>
            <Stat label="Total leads" value={people.length} />
            <Stat label="Hot leads" value={hot} />
            <Stat label="Upcoming calls" value={upcoming} />
            <Stat label="Live listings" value={liveProps} />
            <Stat label="Total listings" value={properties.length} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* Leads */}
            <section>
              <h2 style={{ color: FOREST, fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>Leads (hottest first)</h2>
              {sortedLeads.length === 0 ? (
                <p style={{ color: SAGE, fontSize: 14 }}>No leads yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sortedLeads.map((p) => {
                    const c = tempColor[p.temperature] ?? tempColor.UNSET;
                    const facts = [p.role !== "UNKNOWN" ? p.role : null, p.location, p.budget && `budget ${p.budget}`, p.timeline && `timeline ${p.timeline}`].filter(Boolean);
                    const contact = [p.phone, p.email].filter(Boolean);
                    return (
                      <div key={p.id} style={card}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ color: FOREST, fontSize: 14 }}>{p.name ?? "Unnamed lead"}</strong>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, color: c.fg, background: c.bg }}>{p.temperature}</span>
                          {p.verificationState === "FLAGGED" && (
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, color: "#b91c1c", background: "#fbe6e6" }}>FLAGGED</span>
                          )}
                        </div>
                        {contact.length > 0 && <div style={{ color: FOREST, fontSize: 12, marginTop: 3 }}>{contact.join("  ·  ")}</div>}
                        {facts.length > 0 && <div style={{ color: SAGE, fontSize: 12, marginTop: 2 }}>{facts.join("  ·  ")}</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Right column: calls + listings */}
            <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div>
                <h2 style={{ color: FOREST, fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>Upcoming intro calls</h2>
                {bookings.length === 0 ? (
                  <p style={{ color: SAGE, fontSize: 14 }}>No calls booked.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {bookings.map((b) => (
                      <div key={b.id} style={card}>
                        <div style={{ color: FOREST, fontSize: 13, fontWeight: 600 }}>{new Date(b.startsAt).toLocaleString()}</div>
                        <div style={{ color: SAGE, fontSize: 12, marginTop: 2 }}>
                          {[b.person?.name, b.person?.phone, b.person?.email].filter(Boolean).join("  ·  ") || "Unnamed"} · {b.status}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 style={{ color: FOREST, fontSize: 16, fontWeight: 700, margin: "0 0 10px" }}>Listings</h2>
                {properties.length === 0 ? (
                  <p style={{ color: SAGE, fontSize: 14 }}>No listings.</p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {properties.map((p) => (
                      <div key={p.id} style={card}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <strong style={{ color: FOREST, fontSize: 14 }}>{p.title}</strong>
                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 999, color: p.reviewStatus === "LIVE" ? "#15803d" : GOLD, background: p.reviewStatus === "LIVE" ? "#e7f4ec" : "#f6efdd" }}>{p.reviewStatus}</span>
                        </div>
                        <div style={{ color: SAGE, fontSize: 12, marginTop: 2 }}>
                          {[p.location, p.price, p.rooms && `${p.rooms} rooms`, p.sizeSqm && `${p.sizeSqm} sqm`].filter(Boolean).join("  ·  ")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <a href="/properties" style={{ display: "inline-block", marginTop: 10, color: FOREST, fontSize: 13, fontWeight: 600 }}>Manage listings →</a>
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
