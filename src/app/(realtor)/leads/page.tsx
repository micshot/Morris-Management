"use client";

import { useEffect, useState, useCallback } from "react";
import TempMark from "@/components/TempMark";
import Icon from "@/components/Icon";
import { withSeparators, formatPhone } from "@/lib/format";

type Ev = { id: string; type: string; detail: string | null; createdAt: string };
type Bk = { id: string; startsAt: string; durationMinutes: number; status: string };
type Person = {
  id: string; name: string | null; phone: string | null; email: string | null;
  preferredChannel: string | null; role: string; propertyType: string | null;
  location: string | null; budget: string | null; financingStatus: string | null;
  timeline: string | null; source: string | null; notes: string | null;
  temperature: "HOT" | "WARM" | "COLD" | "UNSET"; verificationState?: string;
  createdAt: string; updatedAt: string; lastIp?: string | null; lastSeenAt?: string | null; messageCount?: number; events?: Ev[]; bookings?: Bk[];
};

const ROLES = ["BUYER", "SELLER", "RENTER", "INVESTOR", "UNKNOWN"];
const TEMPS = ["HOT", "WARM", "COLD", "UNSET"];
const order = { HOT: 0, WARM: 1, COLD: 2, UNSET: 3 } as const;

const FIELDS: { key: keyof Person; label: string; type?: "select"; opts?: string[] }[] = [
  { key: "name", label: "Name" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "preferredChannel", label: "Preferred channel" },
  { key: "role", label: "Role", type: "select", opts: ROLES },
  { key: "temperature", label: "Temperature", type: "select", opts: TEMPS },
  { key: "location", label: "Location" },
  { key: "propertyType", label: "Property type" },
  { key: "budget", label: "Budget" },
  { key: "timeline", label: "Timeline" },
  { key: "financingStatus", label: "Financing" },
  { key: "source", label: "Source" },
];

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

const srcIcon: Record<string, string> = { "web-chat": "🖥", whatsapp: "🟢", manual: "✍️" };

export default function LeadsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Person | null>(null);
  const [tab, setTab] = useState<"details" | "history">("details");
  const [draft, setDraft] = useState<Partial<Person>>({});
  const [saving, setSaving] = useState(false);
  const [tempFilter, setTempFilter] = useState<string | null>(null);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("temp");
    if (t) setTempFilter(t.toUpperCase());
  }, []);

  // Arriving from elsewhere (e.g. an intro call) with ?id= opens that lead directly.
  useEffect(() => {
    if (loading || people.length === 0) return;
    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) return;
    const target = people.find((p) => p.id === id);
    if (target) {
      edit(target);
      // Arriving from a booking? The realtor wants context, not the edit form.
      const wanted = new URLSearchParams(window.location.search).get("tab");
      if (wanted === "history") setTab("history");
      window.history.replaceState({}, "", "/leads");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, people]);

  function clearFilter() {
    setTempFilter(null);
    window.history.replaceState({}, "", "/leads");
  }

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await (await fetch("/api/leads")).json(); setPeople(d.people ?? []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function edit(p: Person) { setOpen(p); setDraft({ ...p }); setTab("details"); }
  function close() { setOpen(null); setDraft({}); }

  async function save() {
    if (!open) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${open.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      if (res.ok) { await load(); close(); }
    } finally { setSaving(false); }
  }
  async function remove() {
    if (!open || !confirm("Delete this lead? This can't be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${open.id}`, { method: "DELETE" });
      if (res.ok) { await load(); close(); return; }
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "Could not delete this lead.");
    } finally { setSaving(false); }
  }
  async function addLead() {
    const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    if (res.ok) { const d = await res.json(); await load(); if (d.person) edit(d.person); }
  }

  // A record only counts as a lead once it has a name or a phone number.
  // Everything else lives in Conversations.
  const identified = people.filter((p) => (p.name && p.name.trim() !== "" && p.name !== "New lead") || (p.phone && p.phone.trim() !== ""));

  const sorted = [...identified]
    .filter((p) => !tempFilter || p.temperature === tempFilter)
    .sort((a, b) => order[a.temperature] - order[b.temperature] || +new Date(b.updatedAt) - +new Date(a.updatedAt));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
        <div><div className="eyebrow">Pipeline</div><h1 style={{ fontSize: 30, marginTop: 4 }}>Leads</h1></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <button className="btn btn-gold" onClick={addLead}>+ Add lead</button>
        </div>
      </div>

      {tempFilter && (
        <div className="filter-note">
          Showing {tempFilter} leads only
          <button onClick={clearFilter} aria-label="Clear filter">×</button>
        </div>
      )}

      {loading ? <p className="muted">Loading…</p> : sorted.length === 0 ? (
        <div className="panel" style={{ padding: 24, textAlign: "center" }}>
          <p className="muted">No leads yet. They appear here as buyers chat — or add one yourself.</p>
        </div>
      ) : (
        <div className="lead-grid">
          {sorted.map((p) => {
            const lastEvent = p.events?.[0];
            return (
              <div key={p.id} className={`lead-card temp-${p.temperature.toLowerCase()}`} onClick={() => edit(p)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  <span style={{ paddingTop: 3 }}>
                    <TempMark temp={p.temperature} size={13} withThermo />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div className="lead-name">{p.name ?? "Unnamed lead"}</div>
                    <div className="lead-meta" style={{ marginTop: 2 }}>
                      Added {ago(p.createdAt)} · active {ago(p.updatedAt)}
                      {typeof p.messageCount === "number" && p.messageCount > 0 && <> · {p.messageCount} msg{p.messageCount > 1 ? "s" : ""}</>}
                    </div>
                    {p.lastIp && (
                      <div className="lead-ip mono" title="Origin IP of their last message">{p.lastIp}</div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0 10px" }}>
                  <span className="lead-chip">{srcIcon[p.source ?? ""] ?? "◦"} {p.source ?? "unknown"}</span>
                  {p.role !== "UNKNOWN" && <span className="lead-chip">{p.role}</span>}
                  {p.verificationState === "VERIFIED" && <span className="lead-chip">✓ verified</span>}
                  {p.verificationState === "FLAGGED" && <span className="lead-chip" style={{ color: "#f2b8b5", borderColor: "rgba(179,38,30,.5)", background: "rgba(179,38,30,.15)" }}>⚑ flagged</span>}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                  {p.phone && <div className="lead-fact">☎ {formatPhone(p.phone)}</div>}
                  {p.email && <div className="lead-fact">✉ {p.email}</div>}
                  {p.location && <div className="lead-fact">⌖ {p.location}</div>}
                  {p.budget && <div className="lead-fact">₪ {withSeparators(p.budget)}</div>}
                  {p.timeline && <div className="lead-fact">◷ {p.timeline}</div>}
                  {p.propertyType && <div className="lead-fact">⌂ {p.propertyType}</div>}
                </div>

                {p.bookings && p.bookings.length > 0 && (
                  <div className="call-chip">
                    <Icon name="calendar" size={12} color="var(--gold-soft)" />
                    Call {new Date(p.bookings[0].startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {p.bookings.length > 1 && <span className="muted"> +{p.bookings.length - 1}</span>}
                  </div>
                )}

                {lastEvent && (
                  <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 11.5, color: "#8f9c91" }}>
                    <span style={{ color: "var(--gold-soft)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", fontSize: 10 }}>{lastEvent.type}</span>
                    {" · "}{lastEvent.detail} · {ago(lastEvent.createdAt)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(20,35,29,.5)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} className="glass-panel" style={{ width: 460, maxWidth: "100vw", height: "100vh", overflowY: "auto", borderLeft: "1px solid var(--gold)" }}>
            <div style={{ padding: "18px 24px 0", background: "rgba(11,18,15,.55)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", position: "sticky", top: 0, zIndex: 1, borderBottom: "1px solid var(--line)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 20, display: "flex", alignItems: "center", gap: 8 }}><TempMark temp={open.temperature} size={13} />{open.name ?? "Unnamed lead"}</h2>
                <button className="btn btn-ghost btn-sm" onClick={close}>Close</button>
              </div>
              <div className="muted" style={{ fontSize: 12, margin: "4px 0 10px" }}>
                Added {new Date(open.createdAt).toLocaleString()} · source {open.source ?? "unknown"}
                {open.lastIp && <> · IP <span className="mono">{open.lastIp}</span></>}
                {typeof open.messageCount === "number" && open.messageCount > 0 && <> · {open.messageCount} messages</>}
              </div>
              <div style={{ display: "flex", gap: 2 }}>
                {(["details", "history"] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)}
                    style={{ background: "transparent", border: "none", cursor: "pointer", padding: "8px 14px", fontSize: 13, fontWeight: 600,
                      color: tab === t ? "var(--forest)" : "var(--muted)",
                      borderBottom: tab === t ? "2px solid var(--gold)" : "2px solid transparent" }}>
                    {t === "details" ? "Details" : `History (${open.events?.length ?? 0})`}
                  </button>
                ))}
              </div>
            </div>

            {open.bookings && open.bookings.length > 0 && (
              <div style={{ padding: "12px 24px 0" }}>
                {open.bookings.map((b) => (
                  <div key={b.id} className="call-chip" style={{ marginBottom: 6 }}>
                    <Icon name="calendar" size={12} color="var(--gold-soft)" />
                    {new Date(b.startsAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    <span className="muted"> · {b.durationMinutes} min · {b.status}</span>
                  </div>
                ))}
              </div>
            )}

            {tab === "details" ? (
              <>
                <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {FIELDS.map((f) => (
                    <label key={String(f.key)} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>{f.label}</span>
                      {f.type === "select" ? (
                        <select value={(draft[f.key] as string) ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}>
                          {f.opts!.map((o) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input value={(draft[f.key] as string) ?? ""} onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })} />
                      )}
                    </label>
                  ))}
                  <label style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: "1 / -1" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>Notes</span>
                    <textarea rows={4} value={(draft.notes as string) ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} style={{ resize: "vertical" }} />
                  </label>
                </div>
                <div style={{ padding: "16px 24px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", background: "rgba(11,18,15,.55)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", position: "sticky", bottom: 0 }}>
                  <button className="btn btn-danger" onClick={remove} disabled={saving}>Delete</button>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-ghost" onClick={close} disabled={saving}>Cancel</button>
                    <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: "20px 24px" }}>
                {!open.events || open.events.length === 0 ? (
                  <p className="muted">No history yet.</p>
                ) : (
                  <div className="timeline">
                    {open.events.map((e) => (
                      <div key={e.id} className={`timeline-item tl-${e.type}`}>
                        <div className="timeline-type">{e.type === "discussed" ? "conversation" : e.type}</div>
                        <div className="timeline-detail">{e.detail ?? "—"}</div>
                        <div className="timeline-when">{new Date(e.createdAt).toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
