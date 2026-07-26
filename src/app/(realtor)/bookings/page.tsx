"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Booking = {
  id: string; startsAt: string; durationMinutes: number;
  status: "REQUESTED" | "CONFIRMED" | "CANCELLED";
  person: { id: string; name: string | null; phone: string | null; email: string | null } | null;
};

const statusPill = (s: string) => {
  const map: Record<string, string> = { REQUESTED: "pill-warm", CONFIRMED: "pill-live", CANCELLED: "pill-unset" };
  return `pill ${map[s] ?? "pill-unset"}`;
};

// Status as a single dot: confirmed = solid green, requested = amber ring,
// cancelled = grey. Same information as the pill in a fraction of the width.
function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = { CONFIRMED: "var(--live)", REQUESTED: "var(--warm)", CANCELLED: "var(--muted)" };
  const c = map[status] ?? "var(--muted)";
  return (
    <span title={status} aria-label={status} style={{
      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
      background: status === "REQUESTED" ? "transparent" : c,
      border: status === "REQUESTED" ? `1.6px solid ${c}` : "none",
    }} />
  );
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
            <thead><tr><th>When</th><th>Lead</th><th>Contact</th><th>Length</th><th></th></tr></thead>
            <tbody>
              {bookings.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => { if (b.person) router.push(`/leads?id=${b.person.id}`); }}
                  style={{ cursor: b.person ? "pointer" : "default" }}
                  title={b.person ? "Open lead record" : undefined}
                >
                  <td style={{ fontWeight: 600 }}>{new Date(b.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</td>
                  <td>
                    {b.person ? (
                      <Link href={`/leads?id=${b.person.id}`} className="lead-link" title="Open lead record">
                        {b.person.name ?? "Unnamed"} <Icon name="arrow" size={11} />
                      </Link>
                    ) : "Unnamed"}
                  </td>
                  <td className="muted">
                    {b.person ? (
                      <Link href={`/leads?id=${b.person.id}`} className="lead-link muted" title="Open lead record">
                        {[b.person.phone, b.person.email].filter(Boolean).join(" · ") || "—"}
                      </Link>
                    ) : "—"}
                  </td>
                  <td className="muted mono">{b.durationMinutes} min</td>
                  
                  <td style={{ width: 34 }}>
                    <span className="act-stack">
                      <StatusDot status={b.status} />
                      {b.status !== "CONFIRMED" && (
                        <button className="act" title="Confirm" aria-label="Confirm" onClick={(e) => { e.stopPropagation(); setStatus(b.id, "CONFIRMED"); }}>
                          <Icon name="check" size={13} color="var(--live)" />
                        </button>
                      )}
                      {b.status !== "CANCELLED" && (
                        <button className="act act-x" title="Cancel" aria-label="Cancel" onClick={(e) => { e.stopPropagation(); setStatus(b.id, "CANCELLED"); }}>
                          <Icon name="x" size={13} color="var(--hot)" />
                        </button>
                      )}
                    </span>
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
