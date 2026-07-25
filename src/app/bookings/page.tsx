"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string;
  startsAt: string;
  durationMinutes: number;
  status: "REQUESTED" | "CONFIRMED" | "CANCELLED";
  person: { name: string | null; phone: string | null; email: string | null } | null;
  agent: { name: string | null } | null;
};

const FOREST = "#1B3A2F";
const GOLD = "#A88532";
const SAGE = "#6B7A70";
const LINE = "#D6DDD4";

const statusColor: Record<string, { fg: string; bg: string }> = {
  REQUESTED: { fg: "#b45309", bg: "#fbeed6" },
  CONFIRMED: { fg: "#15803d", bg: "#e7f4ec" },
  CANCELLED: { fg: SAGE, bg: "#eef1ee" },
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings");
      const data = await res.json();
      setBookings(data.bookings ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <div style={{ borderBottom: `2px solid ${GOLD}`, paddingBottom: 12, marginBottom: 20 }}>
        <h1 style={{ color: FOREST, fontSize: 26, fontWeight: 800, margin: 0 }}>Intro Calls</h1>
        <p style={{ color: SAGE, fontSize: 13, margin: "4px 0 0" }}>
          15-minute intro calls requested by leads.
        </p>
      </div>

      {loading ? (
        <p style={{ color: SAGE }}>Loading…</p>
      ) : bookings.length === 0 ? (
        <p style={{ color: SAGE }}>No calls booked yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {bookings.map((b) => {
            const c = statusColor[b.status] ?? statusColor.REQUESTED;
            const when = new Date(b.startsAt);
            const contact = [b.person?.name, b.person?.phone, b.person?.email].filter(Boolean);
            return (
              <div key={b.id} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <strong style={{ color: FOREST, fontSize: 15 }}>
                    {when.toLocaleString()}
                  </strong>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999, color: c.fg, background: c.bg }}>
                    {b.status}
                  </span>
                  <span style={{ fontSize: 12, color: SAGE }}>· {b.durationMinutes} min</span>
                </div>
                <div style={{ color: FOREST, fontSize: 13 }}>
                  {contact.length ? contact.join("  ·  ") : "Unnamed lead"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
