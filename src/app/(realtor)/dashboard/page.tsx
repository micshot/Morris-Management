"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TempMark from "@/components/TempMark";
import Icon from "@/components/Icon";
import { withSeparators } from "@/lib/format";

type Person = {
  id: string; name: string | null; phone: string | null; email: string | null;
  role: string; location: string | null; budget: string | null; timeline: string | null;
  temperature: "HOT" | "WARM" | "COLD" | "UNSET"; verificationState?: string; createdAt: string;
};
type Booking = { id: string; startsAt: string; status: string; person: { name: string | null; phone: string | null } | null };
type Property = { id: string; title: string | null; location: string | null; price: string | null; reviewStatus: "DRAFT" | "LIVE" };

const pill = (t: string) => `pill pill-${(t || "unset").toLowerCase()}`;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return { text: "Still up", mark: "🌙" };
  if (h < 12) return { text: "Good morning", mark: "☀️" };
  if (h < 17) return { text: "Good afternoon", mark: "🌤️" };
  return { text: "Good evening", mark: "🌆" };
}

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

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

  const dayAgo = Date.now() - 86400000;
  const newToday = people.filter((p) => +new Date(p.createdAt) > dayAgo).length;
  const nextCall = bookings.filter((b) => b.status !== "CANCELLED" && +new Date(b.startsAt) > Date.now())
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))[0];

  const g = greeting();

  const stats = [
    { icon: "users", value: people.length, label: "Total leads", href: "/leads", spark: newToday > 0 ? `${newToday} new today` : "no new today" },
    { icon: "flame", value: hot, label: "Hot leads", href: "/leads?temp=HOT", spark: hot > 0 ? "worth calling now" : "none hot yet" },
    { icon: "phone", value: upcoming, label: "Upcoming calls", href: "/bookings", spark: nextCall ? `next in ${ago(nextCall.startsAt)}` : "nothing booked" },
    { icon: "home", value: live, label: "Live listings", href: "/properties", spark: `${props.length} total` },
  ];

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span>{g.mark}</span> {g.text}
          </div>
          <h1 style={{ fontSize: 30, marginTop: 5 }}>Today at a glance</h1>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <Icon name="bolt" size={14} /> Refresh
        </button>
      </div>

      <div className="chips">
        <Link href="/leads" className="chip"><Icon name="plus" size={14} color="var(--gold-soft)" /> Add lead</Link>
        <Link href="/properties" className="chip"><Icon name="home" size={14} color="var(--gold-soft)" /> New listing</Link>
        <Link href="/calendar" className="chip"><Icon name="calendar" size={14} color="var(--gold-soft)" /> Calendar</Link>
        <a href="/chat" target="_blank" rel="noreferrer" className="chip"><Icon name="chat" size={14} color="var(--gold-soft)" /> Preview chat</a>
      </div>

      <div className="stat-grid" style={{ marginBottom: 26 }}>
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="stat" aria-label={`${s.label}: ${s.value}`}>
            <div className="stat-top">
              <span className="stat-badge"><Icon name={s.icon} size={15} /></span>
              <span className="stat-go"><Icon name="arrow" size={13} /></span>
            </div>
            <div className="stat-num">{loading ? "–" : s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-spark"><Icon name="sparkle" size={10} color="var(--gold-soft)" fill="var(--gold-soft)" strokeWidth={0} /> {s.spark}</div>
          </Link>
        ))}
      </div>

      <div className="split-grid">
        <section className="panel panel-scroll">
          <div className="sec-head">
            <span className="sec-title"><Icon name="users" size={16} color="var(--gold-soft)" /> Leads · hottest first</span>
            <Link href="/leads" className="sec-link">View all <Icon name="arrow" size={13} /></Link>
          </div>
          {loading ? <p className="muted" style={{ padding: 16 }}>Loading…</p> : leads.length === 0 ? (
            <div className="empty">
              <div className="empty-mark">👋</div>
              <div className="empty-text">No leads yet. They land here the moment someone chats.</div>
            </div>
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Contact</th><th>Looking for</th><th></th></tr></thead>
              <tbody>
                {leads.slice(0, 8).map((p) => (
                  <tr key={p.id} onClick={() => (window.location.href = "/leads")}>
                    <td style={{ fontWeight: 600, color: "var(--forest)" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
                        <TempMark temp={p.temperature} size={12} withThermo />{p.name ?? "Unnamed"}
                      </span>
                    </td>
                    <td className="muted">{[p.phone, p.email].filter(Boolean).join(" · ") || "—"}</td>
                    <td className="muted">{[p.location, withSeparators(p.budget)].filter(Boolean).join(" · ") || "—"}</td>
                    <td style={{ width: 22 }}><span className="row-go"><Icon name="arrow" size={13} /></span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="panel">
            <div className="sec-head">
              <span className="sec-title"><Icon name="phone" size={16} color="var(--gold-soft)" /> Upcoming intro calls</span>
            </div>
            {bookings.length === 0 ? (
              <div className="empty">
                <div className="empty-mark">📞</div>
                <div className="empty-text">No calls booked yet.</div>
              </div>
            ) : (
              <div>{bookings.slice(0, 5).map((b) => (
                <div key={b.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--line)" }}>
                  <span className="stat-badge" style={{ width: 26, height: 26, borderRadius: 8 }}><Icon name="clock" size={13} /></span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{new Date(b.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 1 }}>{b.person?.name ?? b.person?.phone ?? "Unnamed"} · {b.status}</div>
                  </div>
                </div>
              ))}</div>
            )}
          </div>

          <div className="panel">
            <div className="sec-head">
              <span className="sec-title"><Icon name="home" size={16} color="var(--gold-soft)" /> Listings</span>
              <Link href="/properties" className="sec-link">Manage <Icon name="arrow" size={13} /></Link>
            </div>
            {props.length === 0 ? (
              <div className="empty">
                <div className="empty-mark">🏠</div>
                <div className="empty-text">No listings yet.</div>
              </div>
            ) : (
              <div>{props.slice(0, 5).map((p) => (
                <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "11px 16px", borderBottom: "1px solid var(--line)" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.title}</div>
                    <div className="muted" style={{ fontSize: 12 }}>{[p.location, withSeparators(p.price)].filter(Boolean).join(" · ")}</div>
                  </div>
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
