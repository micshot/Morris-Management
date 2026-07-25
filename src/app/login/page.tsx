"use client";

import { useState } from "react";

const FOREST = "#1B3A2F";
const GOLD = "#A88532";
const IVORY = "#F7F5EF";
const SAGE = "#6B7A70";
const LINE = "#D6DDD4";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Login failed.");
        return;
      }
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("next") || "/dashboard";
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 360, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 28 }}>
        <div style={{ borderBottom: `2px solid ${GOLD}`, paddingBottom: 12, marginBottom: 20 }}>
          <h1 style={{ color: FOREST, fontSize: 22, fontWeight: 800, margin: 0 }}>Realtor Sign In</h1>
          <p style={{ color: SAGE, fontSize: 13, margin: "4px 0 0" }}>Morris Management</p>
        </div>

        <label style={{ display: "block", fontSize: 12, color: SAGE, fontWeight: 600, marginBottom: 4 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", border: `1px solid ${LINE}`, borderRadius: 6, fontSize: 14, marginBottom: 14, color: FOREST }}
        />

        <label style={{ display: "block", fontSize: 12, color: SAGE, fontWeight: 600, marginBottom: 4 }}>Password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          style={{ width: "100%", boxSizing: "border-box", padding: "9px 11px", border: `1px solid ${LINE}`, borderRadius: 6, fontSize: 14, marginBottom: 16, color: FOREST }}
        />

        {error && <p style={{ color: "#b91c1c", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}

        <button
          onClick={submit}
          disabled={busy}
          style={{ width: "100%", background: FOREST, color: IVORY, border: "none", borderRadius: 6, padding: "10px", fontSize: 15, fontWeight: 600, cursor: busy ? "default" : "pointer", opacity: busy ? 0.6 : 1 }}
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </main>
  );
}
