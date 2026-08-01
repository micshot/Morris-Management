"use client";

import { useEffect, useState, useCallback } from "react";
import Icon from "@/components/Icon";
import TempMark from "@/components/TempMark";
import { withSeparators } from "@/lib/format";

type Ev = { id: string; type: string; detail: string | null; createdAt: string };
type Session = {
  id: string; name: string | null; phone: string | null; email: string | null;
  location: string | null; propertyType: string | null; budget: string | null; timeline: string | null;
  source: string | null; temperature: "HOT" | "WARM" | "COLD" | "UNSET";
  createdAt: string; updatedAt: string; lastIp?: string | null; messageCount?: number; events?: Ev[];
};

function ago(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function ConversationsPage() {
  const [all, setAll] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Session | null>(null);
  const [draft, setDraft] = useState({ name: "", phone: "", email: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await (await fetch("/api/leads")).json(); setAll(d.people ?? []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // Anonymous = no usable name and no phone. These are sessions, not leads.
  const sessions = all
    .filter((p) => !((p.name && p.name.trim() !== "" && p.name !== "New lead") || (p.phone && p.phone.trim() !== "")))
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));

  function openSession(s: Session) {
    setOpen(s);
    setDraft({ name: s.name ?? "", phone: s.phone ?? "", email: s.email ?? "" });
  }

  async function promote() {
    if (!open) return;
    if (!draft.name.trim() && !draft.phone.trim()) {
      alert("Add a name or a phone number to turn this into a lead.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${open.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      if (res.ok) { setOpen(null); await load(); }
    } finally { setSaving(false); }
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
        <div><div className="eyebrow">Anonymous traffic</div><h1 style={{ fontSize: 30, marginTop: 4 }}>Conversations</h1></div>
        <button className="btn btn-ghost" onClick={load}>Refresh</button>
      </div>
      <p className="muted" style={{ fontSize: 13, marginTop: 0, marginBottom: 20, maxWidth: 620 }}>
        People who talked to the assistant but haven&rsquo;t given a name or phone yet. Add either one and they move to Leads.
      </p>

      {loading ? <p className="muted">Loading…</p> : sessions.length === 0 ? (
        <div className="panel"><div className="empty">
          <div className="empty-mark">💬</div>
          <div className="empty-text">No anonymous sessions. Everyone who has chatted gave their details.</div>
        </div></div>
      ) : (
        <div className="lead-grid">
          {sessions.map((s) => {
            const lastTalk = s.events?.find((e) => e.type === "discussed");
            const facts = [s.location, s.propertyType, s.budget && `₪ ${withSeparators(s.budget)}`, s.timeline].filter(Boolean);
            return (
              <div key={s.id} className={`lead-card temp-${s.temperature.toLowerCase()}`} onClick={() => openSession(s)}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
                  <span style={{ paddingTop: 3 }}><TempMark temp={s.temperature} size={13} withThermo /></span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="lead-name">Anonymous session</div>
                    <div className="lead-meta" style={{ marginTop: 2 }}>
                      First seen {ago(s.createdAt)} · last {ago(s.updatedAt)}
                      {typeof s.messageCount === "number" && s.messageCount > 0 && <> · {s.messageCount} msg{s.messageCount > 1 ? "s" : ""}</>}
                    </div>
                    {s.lastIp && <div className="lead-ip mono">{s.lastIp}</div>}
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "12px 0 8px" }}>
                  <span className="lead-chip">{s.source ?? "unknown"}</span>
                  {s.email && <span className="lead-chip">has email</span>}
                </div>

                {facts.length > 0 && <div className="lead-fact" style={{ marginBottom: 6 }}>{facts.join(" · ")}</div>}

                {lastTalk && (
                  <div style={{ marginTop: 8, paddingTop: 9, borderTop: "1px solid rgba(255,255,255,.08)", fontSize: 11.5, color: "#8f9c91" }}>
                    <span style={{ color: "var(--cold)", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", fontSize: 10 }}>said</span>
                    {" · "}{lastTalk.detail}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && (
        <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(13,21,18,.55)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} className="glass-panel" style={{ width: 440, maxWidth: "100vw", height: "100vh", overflowY: "auto", borderLeft: "1px solid var(--gold)" }}>
            <div style={{ padding: "18px 24px", background: "rgba(11,18,15,.55)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", borderBottom: "1px solid var(--line)", position: "sticky", top: 0, zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 19 }}>Anonymous session</h2>
                <button className="btn btn-ghost btn-sm" onClick={() => setOpen(null)}>Close</button>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
                {open.source ?? "unknown"} · {open.messageCount ?? 0} messages
                {open.lastIp && <> · IP <span className="mono">{open.lastIp}</span></>}
              </div>
            </div>

            <div style={{ padding: "18px 24px" }}>
              <div className="field-label" style={{ marginBottom: 8 }}>Turn into a lead</div>
              <div style={{ display: "grid", gap: 10, marginBottom: 8 }}>
                <input placeholder="Name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                <input placeholder="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
                <input placeholder="Email (optional)" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </div>
              <button className="btn btn-gold" onClick={promote} disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
                <Icon name="check" size={14} /> {saving ? "Saving…" : "Move to Leads"}
              </button>
            </div>

            <div style={{ padding: "8px 24px 28px" }}>
              <div className="field-label" style={{ marginBottom: 10 }}>What was discussed</div>
              {!open.events || open.events.length === 0 ? (
                <p className="muted" style={{ fontSize: 13 }}>Nothing recorded yet.</p>
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
          </div>
        </div>
      )}
    </>
  );
}
