"use client";

import { useEffect, useState, useCallback } from "react";

type Person = {
  id: string; name: string | null; phone: string | null; email: string | null;
  preferredChannel: string | null; role: string; propertyType: string | null;
  location: string | null; budget: string | null; financingStatus: string | null;
  timeline: string | null; source: string | null; notes: string | null;
  temperature: "HOT" | "WARM" | "COLD" | "UNSET"; verificationState?: string; updatedAt: string;
};

const pill = (t: string) => `pill pill-${(t || "unset").toLowerCase()}`;
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

export default function LeadsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Person | null>(null);
  const [draft, setDraft] = useState<Partial<Person>>({});
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await (await fetch("/api/leads")).json(); setPeople(d.people ?? []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function edit(p: Person) { setOpen(p); setDraft({ ...p }); }
  function close() { setOpen(null); setDraft({}); }

  async function save() {
    if (!open) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${open.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft),
      });
      if (res.ok) { await load(); close(); }
    } finally { setSaving(false); }
  }

  async function remove() {
    if (!open || !confirm("Delete this lead? This can't be undone.")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${open.id}`, { method: "DELETE" });
      if (res.ok) { await load(); close(); }
    } finally { setSaving(false); }
  }

  async function addLead() {
    // create an empty lead then open it for editing
    const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "New lead" }) });
    if (res.ok) { const d = await res.json(); await load(); if (d.person) edit(d.person); }
  }

  const sorted = [...people].sort((a, b) => order[a.temperature] - order[b.temperature]);

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
        <div><div className="eyebrow">Pipeline</div><h1 style={{ fontSize: 30, marginTop: 4 }}>Leads</h1></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <button className="btn btn-primary" onClick={addLead}>+ Add lead</button>
        </div>
      </div>

      <div className="panel" style={{ overflow: "hidden" }}>
        {loading ? <p className="muted" style={{ padding: 16 }}>Loading…</p> : sorted.length === 0 ? (
          <p className="muted" style={{ padding: 16 }}>No leads yet.</p>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Contact</th><th>Looking for</th><th>Budget</th><th>Source</th><th>Temp</th></tr></thead>
            <tbody>
              {sorted.map((p) => (
                <tr key={p.id} onClick={() => edit(p)}>
                  <td style={{ fontWeight: 600, color: "var(--forest)" }}>
                    {p.name ?? "Unnamed"}
                    {p.verificationState === "FLAGGED" && <span className="pill pill-flagged" style={{ marginLeft: 8 }}>Flagged</span>}
                  </td>
                  <td className="muted">{[p.phone, p.email].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="muted">{[p.location, p.propertyType].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="muted mono">{p.budget || "—"}</td>
                  <td className="muted">{p.source || "—"}</td>
                  <td><span className={pill(p.temperature)}>{p.temperature}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {open && (
        <div onClick={close} style={{ position: "fixed", inset: 0, background: "rgba(20,35,29,.4)", zIndex: 100, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: 440, maxWidth: "100vw", background: "var(--parchment)", height: "100vh", overflowY: "auto", boxShadow: "-8px 0 30px rgba(0,0,0,.2)" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--line)", background: "var(--surface)", position: "sticky", top: 0, zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: 20 }}>Edit lead</h2>
                <button className="btn btn-ghost btn-sm" onClick={close}>Close</button>
              </div>
            </div>
            <div style={{ padding: "20px 24px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {FIELDS.map((f) => (
                <label key={String(f.key)} style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: f.type === "select" ? "auto" : "auto" }}>
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
            <div style={{ padding: "16px 24px", borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", background: "var(--surface)", position: "sticky", bottom: 0 }}>
              <button className="btn btn-danger" onClick={remove} disabled={saving}>Delete</button>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-ghost" onClick={close} disabled={saving}>Cancel</button>
                <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
