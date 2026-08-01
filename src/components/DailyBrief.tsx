"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import { withSeparators, formatPhone } from "@/lib/format";

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

export type BriefProperty = {
  id: string;
  title: string | null;
  location: string | null;
  reviewStatus: "DRAFT" | "LIVE";
  createdAt?: string;
  updatedAt?: string;
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

// Display only. Never write these back to the record.
const label = (p: BriefPerson) => p.name?.trim() || formatPhone(p.phone) || "Unnamed lead";
const facts = (p: BriefPerson) =>
  [p.location, withSeparators(p.budget)].filter(Boolean).join(" · ") || undefined;

function since(iso: string) {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return `${d} days ago`;
}

export function buildBrief(
  people: BriefPerson[],
  viewings: BriefViewing[] = [],
  properties: BriefProperty[] = [],
): BriefItem[] {
  const items: BriefItem[] = [];
  const leads = people.filter(isIdentified);
  const claimed = new Set<string>(); // one row per lead: the first rule wins

  const push = (p: BriefPerson, it: Omit<BriefItem, "key">) => {
    if (claimed.has(p.id)) return;
    claimed.add(p.id);
    items.push({ key: `${it.rank}-${p.id}`, ...it });
  };

  // Rule 2 — verification failed twice and the record was flagged.
  // Someone tried to reach a lead's data and could not prove who they were.
  // A human decides what that was.
  for (const p of leads) {
    if (p.verificationState !== "FLAGGED") continue;
    push(p, {
      rank: 5,
      icon: "x",
      title: label(p),
      reason: "Failed identity verification. Review before sharing anything.",
      meta: facts(p),
      href: `/leads?id=${p.id}`,
    });
  }

  // Rule 3 — a viewing they did not turn up to. Rebook or write them off.
  const byId = new Map(leads.map((p) => [p.id, p]));
  for (const v of viewings) {
    if (v.status !== "NO_SHOW") continue;
    const p = v.person?.id ? byId.get(v.person.id) : undefined;
    if (!p) continue;
    push(p, {
      rank: 8,
      icon: "clock",
      title: label(p),
      reason: `No-show ${since(v.startsAt)}. Rebook or close it out.`,
      meta: v.property?.title ?? undefined,
      href: `/leads?id=${p.id}`,
    });
  }

  // Rule 1 — hot leads with a phone number and no intro call booked.
  // These are the highest-intent contacts nobody has committed time to yet.
  for (const p of leads) {
    if (p.temperature !== "HOT") continue;
    if (!p.phone || p.phone.trim() === "") continue;
    if ((p.bookings ?? []).some((b) => b.status !== "CANCELLED")) continue;
    push(p, {
      rank: 10,
      icon: "flame",
      title: label(p),
      reason: "Hot, no call booked. Worth calling now.",
      meta: facts(p),
      href: `/leads?id=${p.id}`,
    });
  }

  // Rule 4 — live interest that has gone silent. Warm or hotter, nothing on
  // the timeline for a week, nothing in the diary.
  const week = Date.now() - 7 * 86400000;
  for (const p of leads) {
    if (p.temperature !== "HOT" && p.temperature !== "WARM") continue;
    if ((p.bookings ?? []).some((b) => b.status !== "CANCELLED")) continue;
    const last = p.events?.[0]?.createdAt ?? p.lastSeenAt ?? p.createdAt;
    if (+new Date(last) > week) continue;
    push(p, {
      rank: 20,
      icon: "chat",
      title: label(p),
      reason: `${p.temperature === "HOT" ? "Hot" : "Warm"} but quiet since ${since(last)}. Follow up.`,
      meta: facts(p),
      href: `/leads?id=${p.id}`,
    });
  }

  // Rule 5 — an anonymous session that talked properly but never gave a name
  // or a number. One detail short of being a lead.
  for (const p of people) {
    if (isIdentified(p)) continue;
    if ((p.messageCount ?? 0) < 3) continue;
    push(p, {
      rank: 30,
      icon: "users",
      title: p.location ? `Anonymous · ${p.location}` : "Anonymous conversation",
      reason: `${p.messageCount} messages, no name or number. One detail short.`,
      meta: [withSeparators(p.budget), p.lastSeenAt ? `last seen ${since(p.lastSeenAt)}` : null].filter(Boolean).join(" · ") || undefined,
      href: `/conversations?id=${p.id}`,
    });
  }

  // Rule 6 — a listing stuck in DRAFT. Buyers cannot see it and the AI will
  // not mention it, so an unreviewed listing is a listing that does not exist.
  const threeDays = Date.now() - 3 * 86400000;
  for (const pr of properties) {
    if (pr.reviewStatus !== "DRAFT") continue;
    const born = pr.createdAt ?? pr.updatedAt;
    if (born && +new Date(born) > threeDays) continue;
    items.push({
      key: `draft-${pr.id}`,
      rank: 15,
      icon: "home",
      title: pr.title?.trim() || "Untitled listing",
      reason: born
        ? `Still a draft since ${since(born)}. Buyers cannot see it.`
        : "Still a draft. Buyers cannot see it.",
      meta: pr.location ?? undefined,
      href: "/properties",
    });
  }

  return items.sort((a, b) => a.rank - b.rank);
}

export default function DailyBrief({
  people,
  bookings = [],
  viewings = [],
  properties = [],
  loading,
}: {
  people: BriefPerson[];
  bookings?: BriefBooking[];
  viewings?: BriefViewing[];
  properties?: BriefProperty[];
  loading: boolean;
}) {
  const items = loading ? [] : buildBrief(people, viewings, properties);
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
      who: b.person?.name?.trim() || formatPhone(b.person?.phone) || "Unnamed lead",
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
      who: v.person?.name?.trim() || formatPhone(v.person?.phone) || "Unnamed lead",
      detail: v.property?.title ?? null,
      href: "/calendar",
    }));

  return [...calls, ...views].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
}

const hhmm = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export { since };
