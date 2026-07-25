"use client";

import { useEffect, useState, useMemo } from "react";

type Booking = {
  id: string; startsAt: string; status: string;
  person: { name: string | null; phone: string | null } | null;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { const d = await (await fetch("/api/bookings")).json(); setBookings(d.bookings ?? []); }
      finally { setLoading(false); }
    })();
  }, []);

  const byDay = useMemo(() => {
    const m = new Map<string, Booking[]>();
    for (const b of bookings) {
      if (b.status === "CANCELLED") continue;
      const d = new Date(b.startsAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(b);
    }
    return m;
  }, [bookings]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isToday = (d: number) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
        <div><div className="eyebrow">Schedule</div><h1 style={{ fontSize: 30, marginTop: 4 }}>Calendar</h1></div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>←</button>
          <span style={{ fontFamily: 'Fraunces, serif', fontSize: 17, fontWeight: 600, color: "var(--forest)", minWidth: 150, textAlign: "center" }}>{MONTHS[month]} {year}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>→</button>
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</button>
        </div>
      </div>

      <div className="panel" style={{ overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
          {DOW.map((d) => (
            <div key={d} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--line)", background: "var(--surface-2)", textAlign: "center" }}>{d}</div>
          ))}
          {cells.map((d, i) => {
            const key = d ? `${year}-${month}-${d}` : `empty-${i}`;
            const events = d ? byDay.get(key) ?? [] : [];
            return (
              <div key={key} style={{ minHeight: 96, padding: 8, borderBottom: "1px solid var(--line)", borderRight: (i % 7 !== 6) ? "1px solid var(--line)" : "none", background: d ? (isToday(d) ? "rgba(168,133,50,.06)" : "var(--surface)") : "var(--surface-2)" }}>
                {d && (
                  <>
                    <div style={{ fontSize: 12, fontWeight: isToday(d) ? 700 : 500, color: isToday(d) ? "var(--gold)" : "var(--muted)", marginBottom: 5 }}>{d}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {events.slice(0, 3).map((e) => (
                        <div key={e.id} title={`${e.person?.name ?? "Lead"} — ${new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
                          style={{ fontSize: 11, lineHeight: 1.3, padding: "3px 6px", borderRadius: 5, background: e.status === "CONFIRMED" ? "var(--live-bg)" : "var(--warm-bg)", color: e.status === "CONFIRMED" ? "var(--live)" : "var(--warm)", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric" })} {e.person?.name ?? "Call"}
                        </div>
                      ))}
                      {events.length > 3 && <div className="muted" style={{ fontSize: 10 }}>+{events.length - 3} more</div>}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
      {loading && <p className="muted" style={{ marginTop: 12 }}>Loading…</p>}
      <div style={{ display: "flex", gap: 18, marginTop: 14 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }} className="muted"><span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--warm-bg)", border: "1px solid var(--warm)" }} /> Requested</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }} className="muted"><span style={{ width: 12, height: 12, borderRadius: 3, background: "var(--live-bg)", border: "1px solid var(--live)" }} /> Confirmed</span>
      </div>
    </>
  );
}
