"use client";

import { useEffect, useState } from "react";

type Booking = {
  id: string; startsAt: string; durationMinutes: number;
  status: "REQUESTED" | "CONFIRMED" | "CANCELLED";
  person: { name: string | null; phone: string | null; email: string | null } | null;
};

const statusPill = (s: string) => {
  const map: Record<string, string> = { REQUESTED: "pill-warm", CONFIRMED: "pill-live", CANCELLED: "pill-unset" };
  return `pill ${map[s] ?? "pill-unset"}`;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try { const d = await (await fetch("/api/bookings")).json(); setBookings(d.bookings ?? []); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function setStatus(id: string, status: string) {
    await fetch(`/api/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await load();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
        <div><div className="eyebrow">Schedule</div><h1 style={{ fontSize: 30, marginTop: 4 }}>Intro Calls</h1></div>
        <button className="btn btn-ghost" onClick={load}>Refresh</button>
      </div>
      <div className="panel panel-scroll">
        {loading ? <p className="muted" style={{ padding: 16 }}>Loading…</p> : bookings.length === 0 ? (
          <p className="muted" style={{ padding: 16 }}>No calls booked yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>When</th><th>Lead</th><th>Contact</th><th>Length</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id} style={{ cursor: "default" }}>
                  <td style={{ fontWeight: 600 }}>{new Date(b.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td>{b.person?.name ?? "Unnamed"}</td>
                  <td className="muted">{[b.person?.phone, b.person?.email].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="muted mono">{b.durationMinutes} min</td>
                  <td><span className={statusPill(b.status)}>{b.status}</span></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {b.status !== "CONFIRMED" && <button className="btn btn-ghost btn-sm" onClick={() => setStatus(b.id, "CONFIRMED")}>Confirm</button>}
                    {b.status !== "CANCELLED" && <button className="btn btn-danger btn-sm" style={{ marginLeft: 6 }} onClick={() => setStatus(b.id, "CANCELLED")}>Cancel</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
