"use client";

import { useEffect, useState, useRef, useCallback } from "react";

type Img = { id?: string; url: string; label: string | null; kind: string };
type Property = {
  id: string; title: string | null; location: string | null; price: string | null;
  rooms: string | null; sizeSqm: string | null; description: string | null;
  reviewStatus: "DRAFT" | "LIVE"; images?: Img[];
};

const pill = (t: string) => `pill pill-${(t || "draft").toLowerCase()}`;
const empty = { title: "", location: "", price: "", rooms: "", sizeSqm: "", description: "" };

export default function PropertiesPage() {
  const [items, setItems] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...empty });
  const [pending, setPending] = useState<Img[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const d = await (await fetch("/api/properties")).json(); setItems(d.properties ?? []); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function fileToDataUrl(file: File): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result as string);
      r.onerror = () => rej(new Error("read failed"));
      r.readAsDataURL(file);
    });
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setShowForm(true);
    const arr = Array.from(files);
    // First PDF or image → extract fields. All images → attach.
    for (const f of arr) {
      const dataUrl = await fileToDataUrl(f);
      const isImage = f.type.startsWith("image/");
      if (isImage) {
        const isFloor = /floor|plan|תוכנית/i.test(f.name);
        setPending((p) => [...p, { url: dataUrl, label: f.name, kind: isFloor ? "floorplan" : "photo" }]);
      }
    }
    // Extract from the first file (pdf or image)
    const first = arr[0];
    const firstUrl = await fileToDataUrl(first);
    setExtracting(true);
    try {
      const res = await fetch("/api/properties/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl: firstUrl, mediaType: first.type }),
      });
      if (res.ok) {
        const d = await res.json();
        const f2 = d.fields ?? {};
        setForm((prev) => ({
          title: f2.title ?? prev.title,
          location: f2.location ?? prev.location,
          price: f2.price != null ? String(f2.price) : prev.price,
          rooms: f2.rooms != null ? String(f2.rooms) : prev.rooms,
          sizeSqm: f2.sizeSqm != null ? String(f2.sizeSqm) : prev.sizeSqm,
          description: f2.description ?? prev.description,
        }));
      }
    } finally { setExtracting(false); }
  }

  async function save() {
    if (!form.title.trim()) { alert("Add a title first."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, images: pending }),
      });
      if (res.ok) { setForm({ ...empty }); setPending([]); setShowForm(false); await load(); }
    } finally { setSaving(false); }
  }

  async function toggleStatus(p: Property) {
    const next = p.reviewStatus === "LIVE" ? "DRAFT" : "LIVE";
    await fetch(`/api/properties/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reviewStatus: next }) });
    await load();
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22 }}>
        <div><div className="eyebrow">Inventory</div><h1 style={{ fontSize: 30, marginTop: 4 }}>Listings</h1></div>
        <div style={{ display: "flex", gap: 8 }}>
          <input ref={fileRef} type="file" accept="application/pdf,image/*" multiple style={{ display: "none" }} onChange={(e) => onFiles(e.target.files)} />
          <button className="btn btn-gold" onClick={() => fileRef.current?.click()}>Upload sheet / floor plan</button>
          <button className="btn btn-ghost" onClick={() => setShowForm((s) => !s)}>{showForm ? "Hide form" : "+ Add manually"}</button>
        </div>
      </div>

      {(showForm || extracting) && (
        <div className="panel" style={{ padding: 20, marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h3 style={{ fontSize: 16 }}>New listing {extracting && <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>· reading document…</span>}</h3>
            <span className="muted" style={{ fontSize: 12 }}>Saved as Draft until you set it Live</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {(["title", "location", "price", "rooms", "sizeSqm"] as const).map((k) => (
              <label key={k} style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: k === "title" ? "1 / -1" : "auto" }}>
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>{k === "sizeSqm" ? "Size (sqm)" : k}</span>
                <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
              </label>
            ))}
            <label style={{ display: "flex", flexDirection: "column", gap: 5, gridColumn: "1 / -1" }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)" }}>Description</span>
              <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={{ resize: "vertical" }} />
            </label>
          </div>
          {pending.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>Attached images ({pending.length})</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {pending.map((img, i) => (
                  <div key={i} style={{ position: "relative", width: 84, height: 84, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line-strong)" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.label ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    {img.kind === "floorplan" && <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(20,35,29,.8)", color: "#fff", fontSize: 9, textAlign: "center", padding: "2px" }}>FLOOR PLAN</span>}
                    <button onClick={() => setPending((p) => p.filter((_, j) => j !== i))} style={{ position: "absolute", top: 2, right: 2, width: 18, height: 18, borderRadius: "50%", border: "none", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: 11, cursor: "pointer", lineHeight: 1 }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => { setForm({ ...empty }); setPending([]); setShowForm(false); }} disabled={saving}>Cancel</button>
            <button className="btn btn-primary" onClick={save} disabled={saving || extracting}>{saving ? "Saving…" : "Save listing"}</button>
          </div>
        </div>
      )}

      <div className="panel" style={{ overflow: "hidden" }}>
        {loading ? <p className="muted" style={{ padding: 16 }}>Loading…</p> : items.length === 0 ? (
          <p className="muted" style={{ padding: 16 }}>No listings yet. Upload a sheet or add one manually.</p>
        ) : (
          <table className="table">
            <thead><tr><th></th><th>Title</th><th>Location</th><th>Price</th><th>Rooms</th><th>Size</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {items.map((p) => {
                const cover = p.images?.[0];
                return (
                  <tr key={p.id} style={{ cursor: "default" }}>
                    <td style={{ width: 52 }}>
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover.url} alt="" style={{ width: 40, height: 40, borderRadius: 6, objectFit: "cover", border: "1px solid var(--line)" }} />
                      ) : <div style={{ width: 40, height: 40, borderRadius: 6, background: "var(--surface-2)", border: "1px solid var(--line)" }} />}
                    </td>
                    <td style={{ fontWeight: 600, color: "var(--forest)" }}>{p.title}{p.images && p.images.length > 1 && <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}> · {p.images.length} imgs</span>}</td>
                    <td className="muted">{p.location || "—"}</td>
                    <td className="muted mono">{p.price || "—"}</td>
                    <td className="muted mono">{p.rooms || "—"}</td>
                    <td className="muted mono">{p.sizeSqm || "—"}</td>
                    <td><span className={pill(p.reviewStatus)}>{p.reviewStatus}</span></td>
                    <td style={{ textAlign: "right" }}><button className="btn btn-ghost btn-sm" onClick={() => toggleStatus(p)}>{p.reviewStatus === "LIVE" ? "Unpublish" : "Set live"}</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
