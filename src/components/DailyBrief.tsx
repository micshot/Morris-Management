"use client";

import Link from "next/link";
import Icon from "@/components/Icon";

// The daily brief: the dashboard's answer to "what should I do today?".
// Rules are pure functions over data the dashboard has already fetched.
// Lower `rank` sorts first. Add a rule by pushing into buildBrief().

export type BriefPerson = {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  budget: string | null;
  temperature: "HOT" | "WARM" | "COLD" | "UNSET";
  verificationState?: string | null;
  messageCount?: number | null;
  lastSeenAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  bookings?: { id: string; startsAt: string; status: string }[];
  events?: { id: string; type: string; detail: string | null; createdAt: string }[];
};

export type BriefBooking = {
  id: string;
  startsAt: string;
  status: string;
  person?: { id?: string; name: string | null; phone: string | null } | null;
};

export type BriefViewing = {
  id: string;
  startsAt: string;
  status: string;
  person?: { id?: string; name: string | null; phone: string | null } | null;
  property?: { title: string | null } | null;
};

export type BriefItem = {
  key: string;
  rank: number;
  icon: string;
  title: string;
  reason: string;
  href: string;
  meta?: string;
};

export function isIdentified(p: BriefPerson) {
  const named = !!p.name && p.name.trim() !== "" && p.name !== "New lead";
  const phoned = !!p.phone && p.phone.trim() !== "";
  return named || phoned;
}

const label = (p: BriefPerson) => p.name?.trim() || p.phone?.trim() || "Unnamed lead";

function since(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

export function buildBrief(people: BriefPerson[]): BriefItem[] {
  const items: BriefItem[] = [];
  const leads = people.filter(isIdentified);

  // Rule 1 — hot leads with a phone number and no intro call booked.
  // These are the highest-intent contacts nobody has committed time to yet.
  for (const p of leads) {
    if (p.temperature !== "HOT") continue;
    if (!p.phone || p.phone.trim() === "") continue;
    if ((p.bookings ?? []).some((b) => b.status !== "CANCELLED")) continue;
    items.push({
      key: `call-${p.id}`,
      rank: 10,
      icon: "flame",
      title: label(p),
      reason: "Hot, no call booked. Worth calling now.",
      meta: [p.location, p.budget].filter(Boolean).join(" · ") || undefined,
      href: `/leads?focus=${p.id}`,
    });
  }

  return items.sort((a, b) => a.rank - b.rank);
}

export default function DailyBrief({
  people,
  bookings = [],
  viewings = [],
  loading,
}: {
  people: BriefPerson[];
  bookings?: BriefBooking[];
  viewings?: BriefViewing[];
  loading: boolean;
}) {
  const items = loading ? [] : buildBrief(people);
  const today = loading ? [] : buildToday(bookings, viewings);

  return (
    <section className="panel brief" style={{ marginBottom: 22 }}>
      <div className="sec-head">
        <span className="sec-title">
          <Icon name="bolt" size={16} color="var(--gold-soft)" /> Do this first
        </span>
        {items.length > 0 && <span className="brief-count">{items.length}</span>}
      </div>

      {!loading && today.length > 0 && (
        <div className="brief-today">
          <div className="brief-today-head">Today</div>
          <div className="brief-today-rows">
            {today.map((t) => (
              <Link key={t.id} href={t.href} className="brief-today-row">
                <span className="brief-time">{hhmm(t.startsAt)}</span>
                <span className="brief-icon"><Icon name={t.icon} size={13} /></span>
                <span className="brief-body">
                  <span className="brief-title">{t.who}</span>
                  <span className="brief-meta">{[t.kind, t.detail].filter(Boolean).join(" · ")}</span>
                </span>
                <span className="row-go"><Icon name="arrow" size={13} /></span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="muted" style={{ padding: 16 }}>Loading…</p>
      ) : items.length === 0 && today.length === 0 ? (
        <div className="empty">
          <div className="empty-mark">✅</div>
          <div className="empty-text">Nothing needs you right now. Everything is booked or cooling.</div>
        </div>
      ) : items.length === 0 ? null : (
        <div className="brief-list">
          {items.map((it) => (
            <Link key={it.key} href={it.href} className="brief-row">
              <span className="brief-icon"><Icon name={it.icon} size={14} /></span>
              <span className="brief-body">
                <span className="brief-title">{it.title}</span>
                <span className="brief-reason">{it.reason}</span>
                {it.meta && <span className="brief-meta">{it.meta}</span>}
              </span>
              <span className="row-go"><Icon name="arrow" size={13} /></span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// Everything happening today, calls and viewings interleaved in time order.
// Cancelled entries drop out; a no-show stays visible until the day is over
// because it still needs a follow-up.
export function buildToday(bookings: BriefBooking[], viewings: BriefViewing[]) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const end = start + 86400000;
  const inDay = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start && t < end;
  };

  const calls = bookings
    .filter((b) => b.status !== "CANCELLED" && inDay(b.startsAt))
    .map((b) => ({
      id: `call-${b.id}`,
      startsAt: b.startsAt,
      kind: "Intro call",
      icon: "phone",
      who: b.person?.name?.trim() || b.person?.phone?.trim() || "Unnamed lead",
      detail: b.status === "REQUESTED" ? "Not confirmed yet" : null,
      href: "/bookings",
    }));

  const views = viewings
    .filter((v) => v.status !== "CANCELLED" && inDay(v.startsAt))
    .map((v) => ({
      id: `view-${v.id}`,
      startsAt: v.startsAt,
      kind: "Viewing",
      icon: "home",
      who: v.person?.name?.trim() || v.person?.phone?.trim() || "Unnamed lead",
      detail: v.property?.title ?? null,
      href: "/calendar",
    }));

  return [...calls, ...views].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
}

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export { since };
