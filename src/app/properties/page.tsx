"use client";

import { useEffect, useState } from "react";

type Property = {
  id: string;
  title: string | null;
  location: string | null;
  price: string | null;
  rooms: string | null;
  sizeSqm: string | null;
  description: string | null;
  reviewStatus: "DRAFT" | "LIVE";
  updatedAt: string;
};

const FOREST = "#1B3A2F";
const FOREST_SLATE = "#24443A";
const GOLD = "#A88532";
const IVORY = "#F7F5EF";
const SAGE = "#6B7A70";
const LINE = "#D6DDD4";

const emptyForm = {
  title: "",
  location: "",
  price: "",
  rooms: "",
  sizeSqm: "",
  description: "",
};

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/properties");
      const data = await res.json();
      setProperties(data.properties ?? []);
    } catch {
      setError("Could not load properties.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addProperty() {
    setError(null);
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Could not save property.");
        return;
      }
      setForm({ ...emptyForm });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, reviewStatus: "LIVE" | "DRAFT") {
    await fetch(`/api/properties/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewStatus }),
    });
    await load();
  }

  const field = (
    label: string,
    key: keyof typeof form,
    placeholder = ""
  ) => (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 140px" }}>
      <span style={{ fontSize: 12, color: SAGE, fontWeight: 600 }}>{label}</span>
      <input
        value={form[key]}
        placeholder={placeholder}
        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        style={{
          padding: "8px 10px",
          border: `1px solid ${LINE}`,
          borderRadius: 6,
          fontSize: 14,
          background: "#fff",
          color: FOREST_SLATE,
        }}
      />
    </label>
  );

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <div style={{ borderBottom: `2px solid ${GOLD}`, paddingBottom: 12, marginBottom: 24 }}>
        <h1 style={{ color: FOREST, fontSize: 26, fontWeight: 800, margin: 0 }}>
          Properties
        </h1>
        <p style={{ color: SAGE, fontSize: 13, margin: "4px 0 0" }}>
          Add a property manually. New properties are saved as Draft until reviewed.
        </p>
      </div>

      {/* Add form */}
      <section
        style={{
          background: "#fff",
          border: `1px solid ${LINE}`,
          borderRadius: 10,
          padding: 18,
          marginBottom: 28,
        }}
      >
        <h2 style={{ color: FOREST, fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>
          Add property
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {field("Title *", "title", "3-room in Modi'in")}
          {field("Location", "location", "Modi'in")}
          {field("Price", "price", "₪2,100,000")}
          {field("Rooms", "rooms", "3")}
          {field("Size (sqm)", "sizeSqm", "82")}
        </div>
        <label style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 12 }}>
          <span style={{ fontSize: 12, color: SAGE, fontWeight: 600 }}>Description</span>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={2}
            style={{
              padding: "8px 10px",
              border: `1px solid ${LINE}`,
              borderRadius: 6,
              fontSize: 14,
              background: "#fff",
              color: FOREST_SLATE,
              resize: "vertical",
            }}
          />
        </label>
        {error && (
          <p style={{ color: "#9a3412", fontSize: 13, margin: "10px 0 0" }}>{error}</p>
        )}
        <button
          onClick={addProperty}
          disabled={saving}
          style={{
            marginTop: 14,
            background: FOREST,
            color: IVORY,
            border: "none",
            borderRadius: 6,
            padding: "9px 18px",
            fontSize: 14,
            fontWeight: 600,
            cursor: saving ? "default" : "pointer",
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? "Saving…" : "Add property"}
        </button>
      </section>

      {/* List */}
      <h2 style={{ color: FOREST, fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>
        All properties {properties.length > 0 && `(${properties.length})`}
      </h2>

      {loading ? (
        <p style={{ color: SAGE }}>Loading…</p>
      ) : properties.length === 0 ? (
        <p style={{ color: SAGE }}>No properties yet. Add one above.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {properties.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#fff",
                border: `1px solid ${LINE}`,
                borderRadius: 8,
                padding: 14,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <strong style={{ color: FOREST_SLATE, fontSize: 15 }}>
                    {p.title}
                  </strong>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 999,
                      color: p.reviewStatus === "LIVE" ? "#15803d" : GOLD,
                      background: p.reviewStatus === "LIVE" ? "#e7f4ec" : "#f6efdd",
                    }}
                  >
                    {p.reviewStatus}
                  </span>
                </div>
                <div style={{ color: SAGE, fontSize: 13, marginTop: 4 }}>
                  {[p.location, p.price, p.rooms && `${p.rooms} rooms`, p.sizeSqm && `${p.sizeSqm} sqm`]
                    .filter(Boolean)
                    .join("  ·  ")}
                </div>
                {p.description && (
                  <div style={{ color: FOREST_SLATE, fontSize: 13, marginTop: 6 }}>
                    {p.description}
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                {p.reviewStatus === "DRAFT" ? (
                  <button
                    onClick={() => setStatus(p.id, "LIVE")}
                    style={{
                      background: GOLD,
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Review → Live
                  </button>
                ) : (
                  <button
                    onClick={() => setStatus(p.id, "DRAFT")}
                    style={{
                      background: "transparent",
                      color: SAGE,
                      border: `1px solid ${LINE}`,
                      borderRadius: 6,
                      padding: "6px 12px",
                      fontSize: 13,
                      cursor: "pointer",
                    }}
                  >
                    Unpublish
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
