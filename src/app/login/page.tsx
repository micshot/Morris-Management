"use client";

import { useState } from "react";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null); setBusy(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Login failed."); return; }
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get("next") || "/dashboard";
    } finally { setBusy(false); }
  }

  return (
    <main style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "calc(2rem + env(safe-area-inset-top, 0px)) 2rem calc(2rem + env(safe-area-inset-bottom, 0px))" }}>
      <div className="panel" style={{ width: "100%", maxWidth: 380, padding: "30px 30px 26px", borderTop: "3px solid var(--gold)" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <Logo size={54} />
        </div>
        <div className="eyebrow" style={{ textAlign: "center" }}>Morris Management</div>
        <h1 style={{ fontSize: 24, margin: "6px 0 22px", textAlign: "center" }}>Realtor sign in</h1>

        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 }}>Email</label>
        <input value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ marginBottom: 16 }} />

        <label style={{ display: "block", fontSize: 11.5, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 5 }}>Password</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} style={{ marginBottom: 18 }} />

        {error && <p style={{ color: "#e57373", fontSize: 13, margin: "0 0 12px" }}>{error}</p>}

        <button className="btn btn-gold" onClick={submit} disabled={busy} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </main>
  );
}
