"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/leads", label: "Leads" },
  { href: "/properties", label: "Listings" },
  { href: "/calendar", label: "Calendar" },
  { href: "/bookings", label: "Intro Calls" },
];

export default function RealtorLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/chat";
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: "var(--sidebar-w)",
          background: "var(--ink)",
          color: "#cdd6cf",
          display: "flex",
          flexDirection: "column",
          position: "sticky",
          top: 0,
          height: "100vh",
          flexShrink: 0,
        }}
      >
        <div style={{ padding: "22px 20px 18px", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
          <div style={{ fontFamily: "var(--font-fraunces), serif", fontSize: 17, fontWeight: 600, color: "#fff", letterSpacing: "-.01em" }}>
            Morris <span style={{ color: "var(--gold-soft)" }}>Management</span>
          </div>
          <div style={{ fontSize: 11, color: "#7f8c83", marginTop: 2, letterSpacing: ".08em", textTransform: "uppercase" }}>
            Agency workspace
          </div>
        </div>

        <nav style={{ padding: "12px 10px", flex: 1 }}>
          {NAV.map((n) => {
            const active = path === n.href || path.startsWith(n.href + "/");
            return (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  display: "block",
                  padding: "9px 12px",
                  margin: "2px 0",
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? "#fff" : "#aab4ac",
                  background: active ? "rgba(168,133,50,.18)" : "transparent",
                  borderLeft: active ? "2px solid var(--gold-soft)" : "2px solid transparent",
                }}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: "14px 16px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <button
            onClick={logout}
            style={{
              width: "100%",
              background: "transparent",
              color: "#8f9a91",
              border: "1px solid rgba(255,255,255,.12)",
              borderRadius: 7,
              padding: "8px",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, background: "var(--parchment)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "28px 32px 64px" }}>{children}</div>
      </main>
    </div>
  );
}
