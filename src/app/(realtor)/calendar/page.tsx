"use client";

import { useEffect, useState, useCallback } from "react";
import Icon from "@/components/Icon";
import { formatPhone } from "@/lib/format";

type Booking = { id: string; startsAt: string; durationMinutes: number; status: string; person: { id: string; name: string | null; phone: string | null } | null };
type Viewing = {
  id: string; startsAt: string; durationMinutes: number; status: string; notes: string | null;
  person: { id: string; name: string | null; phone: string | null } | null;
  property: { id: string; title: string | null; location: string | null } | null;
};
type Lead = { id: string; name: string | null; phone: string | null };
type Prop = { id: string; title: string | null; location: string | null };

type Entry = {
  kind: "call" | "viewing";
  id: string; startsAt: string; durationMinutes: number; status: string;
  who: string; phone: string | null; personId: string | null; where: string | null;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const iso = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

export default function CalendarPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [adding, setAdding] = useState<string | null>(null); // yyyy-mm-dd prefill
  const [form, setForm] = useState({ personId: "", propertyId: "", date: "", time: "10:00", durationMinutes: 30, notes: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, v, l, p] = await Promise.all([
        fetch("/api/bookings").then((r) => r.json()),
        fetch("/api/viewings").then((r) => r.json()),
        fetch("/api/leads").then((r) => r.json()),
        fetch("/api/properties").then((r) => r.json()),
      ]);
      setBookings(b.bookings ?? []); setViewings(v.viewings ?? []);
      setLeads(l.people ?? []); setProps(p.properties ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const entries: Entry[] = [
    ...bookings.filter((b) => b.status !== "CANCELLED").map((b) => ({
      kind: "call" as const, id: b.id, startsAt: b.startsAt, durationMinutes: b.durationMinutes, status: b.status,
      who: b.person?.name ?? "Unnamed", phone: b.person?.phone ?? null, personId: b.person?.id ?? null, where: null,
    })),
    ...viewings.filter((v) => v.status !== "CANCELLED").map((v) => ({
      kind: "viewing" as const, id: v.id, startsAt: v.startsAt, durationMinutes: v.durationMinutes, status: v.status,
      who: v.person?.name ?? "Unnamed", phone: v.person?.phone ?? null, personId: v.person?.id ?? null,
      where: v.property?.title ?? v.property?.location ?? null,
    })),
  ].sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));

  const byDay = new Map<string, Entry[]>();
  for (const e of entries) {
    const k = iso(new Date(e.startsAt));
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }

  const year = cursor.getFullYear(), month = cursor.getMonth();
  const firstDow = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const todayKey = iso(new Date());
  const upcoming = entries.filter((e) => +new Date(e.startsAt) >= Date.now() - 3600000);

  function openAdd(dayKey?: string) {
    const d = dayKey ? new Date(dayKey) : new Date();
    setForm({ personId: leads[0]?.id ?? "", propertyId: "", date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`, time: "10:00", durationMinutes: 30, notes: "" });
    setAdding("open");
  }

  async function saveViewing() {
    if (!form.personId) { alert("Pick a lead."); return; }
    setSaving(true);
    try {
      const startsAt = new Date(`${form.date}T${form.time}`).toISOString();
      const res = await fetch("/api/viewings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personId: form.personId, propertyId: form.propertyId || undefined, startsAt, durationMinutes: Number(form.durationMinutes), notes: form.notes }),
      });
      if (res.ok) { setAdding(null); await load(); }
      else { const d = await res.json().catch(() => ({})); alert(d.error ?? "Could not save."); }
    } finally { setSaving(false); }
  }

  async function setViewingStatus(id: string, status: string) {
    await fetch(`/api/viewings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    await load();
  }

  const EntryRow = ({ e, showDate = false }: { e: Entry; showDate?: boolean }) => (
    <div className="cal-entry">
      <span className={`cal-dot cal-dot-${e.kind}`} title={e.kind === "call" ? "Intro call" : "Viewing"} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--forest)" }}>
          {showDate && <>{new Date(e.startsAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })} · </>}
          {new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
          <span className="muted" style={{ fontWeight: 400 }}> · {e.durationMinutes}m</span>
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {e.kind === "viewing" ? "Viewing" : "Intro call"} · {e.who}
          {e.where && <> · {e.where}</>}
          {e.phone && <> · {formatPhone(e.phone)}</>}
        </div>
      </div>
      {e.personId && (
        <a href={`/leads?id=${e.personId}&tab=history`} className="act" title="Open lead"><Icon name="arrow" size={13} color="var(--gold-soft)" /></a>
      )}
      {e.kind === "viewing" && e.status === "SCHEDULED" && (
        <>
          <button className="act" title="Mark completed" onClick={() => setViewingStatus(e.id, "COMPLETED")}><Icon name="check" size={13} color="var(--live)" /></button>
          <button className="act act-x" title="Cancel viewing" onClick={() => setViewingStatus(e.id, "CANCELLED")}><Icon name="x" size={13} color="var(--hot)" /></button>
        </>
      )}
    </div>
  );

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div><div className="eyebrow">Schedule</div><h1 style={{ fontSize: 30, marginTop: 4 }}>Calendar</h1></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <button className="btn btn-gold" onClick={() => openAdd()}><Icon name="plus" size={14} /> Add viewing</button>
        </div>
      </div>

      <div className="cal-legend">
        <span><span className="cal-dot cal-dot-call" /> Intro calls <span className="muted">({bookings.filter(b=>b.status!=="CANCELLED").length})</span></span>
        <span><span className="cal-dot cal-dot-viewing" /> Viewings <span className="muted">({viewings.filter(v=>v.status!=="CANCELLED").length})</span></span>
      </div>

      {/* Month grid — desktop and tablet */}
      <div className="panel only-wide" style={{ marginBottom: 20 }}>
        <div className="sec-head">
          <span className="sec-title"><Icon name="calendar" size={16} color="var(--gold-soft)" /> {MONTHS[month]} {year}</span>
          <span style={{ display: "flex", gap: 6 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month - 1, 1))}>←</button>
            <button className="btn btn-ghost btn-sm" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>Today</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setCursor(new Date(year, month + 1, 1))}>→</button>
          </span>
        </div>
        <div className="cal-grid">
          {DOW.map((d) => <div key={d} className="cal-dow">{d}</div>)}
          {cells.map((d, i) => {
            const key = d ? `${year}-${month}-${d}` : `empty-${i}`;
            const list = d ? byDay.get(key) ?? [] : [];
            const isToday = key === todayKey;
            return (
              <div key={key} className={`cal-cell${d ? "" : " is-empty"}${isToday ? " is-today" : ""}`} onClick={() => d && openAdd(`${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`)}>
                {d && <div className="cal-daynum">{d}</div>}
                {list.slice(0, 3).map((e) => (
                  <div key={e.id} className={`cal-chip cal-chip-${e.kind}`} title={`${e.kind === "call" ? "Intro call" : "Viewing"} · ${e.who}`}>
                    {new Date(e.startsAt).toLocaleTimeString([], { hour: "numeric" })} {e.who}
                  </div>
                ))}
                {list.length > 3 && <div className="muted" style={{ fontSize: 10.5, marginTop: 2 }}>+{list.length - 3} more</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Agenda — the primary view on phones, a companion on desktop */}
      <div className="panel">
        <div className="sec-head">
          <span className="sec-title"><Icon name="clock" size={16} color="var(--gold-soft)" /> Upcoming</span>
          <span className="muted" style={{ fontSize: 12 }}>{upcoming.length} scheduled</span>
        </div>
        {loading ? <p className="muted" style={{ padding: 16 }}>Loading…</p> : upcoming.length === 0 ? (
          <div className="empty">
            <div className="empty-mark">🗓️</div>
            <div className="empty-text">Nothing scheduled. Add a viewing or wait for a buyer to book a call.</div>
          </div>
        ) : (
          <div>{upcoming.map((e) => <EntryRow key={`${e.kind}-${e.id}`} e={e} showDate />)}</div>
        )}
      </div>

      {adding && (
        <div onClick={() => setAdding(null)} style={{ position: "fixed", inset: 0, background: "rgba(13,21,18,.6)", zIndex: 120, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} className="panel" style={{ width: 420, maxWidth: "100%", padding: 22, borderTop: "3px solid var(--gold)" }}>
            <h2 style={{ fontSize: 19, marginBottom: 14 }}>Schedule a viewing</h2>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 5 }}>
                <span className="field-label">Lead</span>
                <select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })}>
                  <option value="">Select a lead…</option>
                  {leads.map((l) => <option key={l.id} value={l.id}>{l.name ?? "Unnamed"}{l.phone ? ` · ${l.phone}` : ""}</option>)}
                </select>
              </label>
              <label style={{ display: "grid", gap: 5 }}>
                <span className="field-label">Property</span>
                <select value={form.propertyId} onChange={(e) => setForm({ ...form, propertyId: e.target.value })}>
                  <option value="">No specific listing</option>
                  {props.map((p) => <option key={p.id} value={p.id}>{p.title}{p.location ? ` · ${p.location}` : ""}</option>)}
                </select>
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 10 }}>
                <label style={{ display: "grid", gap: 5 }}>
                  <span className="field-label">Date</span>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </label>
                <label style={{ display: "grid", gap: 5 }}>
                  <span className="field-label">Time</span>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </label>
                <label style={{ display: "grid", gap: 5 }}>
                  <span className="field-label">Mins</span>
                  <input type="number" min={15} step={15} value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: Number(e.target.value) })} />
                </label>
              </div>
              <label style={{ display: "grid", gap: 5 }}>
                <span className="field-label">Notes</span>
                <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} style={{ resize: "vertical" }} />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
              <button className="btn btn-ghost" onClick={() => setAdding(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-gold" onClick={saveViewing} disabled={saving}>{saving ? "Saving…" : "Schedule viewing"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
