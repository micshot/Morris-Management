"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TempMark from "@/components/TempMark";

type Person = {
  id: string; name: string | null; phone: string | null; email: string | null;
  role: string; location: string | null; budget: string | null; timeline: string | null;
  temperature: "HOT" | "WARM" | "COLD" | "UNSET"; verificationState?: string;
};
type Booking = { id: string; startsAt: string; status: string; person: { name: string | null; phone: string | null } | null };
type Property = { id: string; title: string | null; location: string | null; price: string | null; reviewStatus: "DRAFT" | "LIVE" };

const pill = (t: string) => `pill pill-${(t || "unset").toLowerCase()}`;

export default function Dashboard() {
  const [people, setPeople] = useState<Person[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [props, setProps] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [l, b, p] = await Promise.all([
        fetch("/api/leads").then((r) => r.json()),
        fetch("/api/bookings").then((r) => r.json()),
        fetch("/api/properties").then((r) => r.json()),
      ]);
      setPeople(l.people ?? []); setBookings(b.bookings ?? []); setProps(p.properties ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const order = { HOT: 0, WARM: 1, COLD: 2, UNSET: 3 } as const;
  const leads = [...people].sort((a, b) => order[a.temperature] - order[b.temperature]);
  const hot = people.filter((p) => p.temperature === "HOT").length;
  const live = props.filter((p) => p.reviewStatus === "LIVE").length;
  const upcoming = bookings.filter((b) => b.status !== "CANCELLED").length;

  const stats = [
    { label: "Total leads", value: people.length },
    { label: "Hot leads", value: hot },
    { label: "Upcoming calls", value: upcoming },
    { label: "Live listings", value: live },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
        <div>
          <div className="eyebrow">Overview</div>
          <h1 style={{ fontSize: 30, marginTop: 4 }}>Today at a glance</h1>
        </div>
        <button className="btn btn-ghost" onClick={load}>Refresh</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 28 }}>
        {stats.map((s) => (
          <div key={s.label} className="panel" style={{ padding: "18px 20px" }}>
            <div className="mono" style={{ fontSize: 32, fontFamily: 'Fraunces, serif', fontWeight: 600, color: "var(--forest)", lineHeight: 1 }}>{s.value}</div>
            <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div className="split-grid">
        <section className="panel panel-scroll">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
            <h3 style={{ fontSize: 15 }}>Leads · hottest first</h3>
            <Link href="/leads" style={{ fontSize: 12.5, fontWeight: 600 }}>View all →</Link>
          </div>
          {loading ? <p className="muted" style={{ padding: 16 }}>Loading…</p> : leads.length === 0 ? (
            <p className="muted" style={{ padding: 16 }}>No leads yet. They appear here as buyers chat.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Contact</th><th>Looking for</th></tr></thead>
              <tbody>
                {leads.slice(0, 8).map((p) => (
                  <tr key={p.id} onClick={() => (window.location.href = "/leads")}>
                    <td style={{ fontWeight: 600, color: "var(--forest)" }}><span style={{ display: "flex", alignItems: "center", gap: 9 }}><TempMark temp={p.temperature} size={12} withThermo />{p.name ?? "Unnamed"}</span></td>
                    <td className="muted">{[p.phone, p.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="muted">{[p.location, p.budget].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="panel" style={{ overflow: "hidden" }}>
            <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--line)" }}><h3 style={{ fontSize: 15 }}>Upcoming intro calls</h3></div>
            {bookings.length === 0 ? <p className="muted" style={{ padding: 16 }}>No calls booked.</p> : (
              <div>{bookings.slice(0, 5).map((b) => (
                <div key={b.id} style={{ padding: "11px 16px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(b.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{b.person?.name ?? b.person?.phone ?? "Unnamed"} · {b.status}</div>
                </div>
              ))}</div>
            )}
          </div>
          <div className="panel" style={{ overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--line)" }}>
              <h3 style={{ fontSize: 15 }}>Listings</h3>
              <Link href="/properties" style={{ fontSize: 12.5, fontWeight: 600 }}>Manage →</Link>
            </div>
            {props.length === 0 ? <p className="muted" style={{ padding: 16 }}>No listings.</p> : (
              <div>{props.slice(0, 5).map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 16px", borderBottom: "1px solid var(--line)" }}>
                  <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.title}</div><div className="muted" style={{ fontSize: 12 }}>{[p.location, p.price].filter(Boolean).join(" · ")}</div></div>
                  <span className={pill(p.reviewStatus)}>{p.reviewStatus}</span>
                </div>
              ))}</div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
