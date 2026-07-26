"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/Logo";

const I = (d: string) => (
  <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const NAV = [
  { href: "/dashboard", label: "Overview", icon: "M3 12l9-8 9 8M5 10v10h14V10" },
  { href: "/leads", label: "Leads", icon: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0 .01M22 21v-2a4 4 0 0 0-3-3.87" },
  { href: "/conversations", label: "Conversations", icon: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" },
  { href: "/properties", label: "Listings", icon: "M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
  { href: "/calendar", label: "Calendar", icon: "M8 2v4M16 2v4M3 9h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" },
  { href: "/bookings", label: "Intro Calls", icon: "M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" },
];

export default function RealtorLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/chat";
  }

  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-brand">
          <span className="rail-logo"><Logo size={30} color="var(--gold-soft)" /></span>
          <span className="rail-mark"><Logo size={26} ring={false} color="var(--gold-soft)" /></span>
          <span className="rail-wordmark">
            <span style={{ fontFamily: "Fraunces, serif", fontSize: 17, fontWeight: 600, color: "#fff", letterSpacing: "-.01em", display: "block" }}>
              Morris <span style={{ color: "var(--gold-soft)" }}>Management</span>
            </span>
            <span style={{ fontSize: 11, color: "#7f8c83", letterSpacing: ".08em", textTransform: "uppercase" }}>Agency workspace</span>
          </span>
        </div>

        <nav className="rail-nav">
          {NAV.map((n) => {
            const active = path === n.href || path.startsWith(n.href + "/");
            return (
              <Link key={n.href} href={n.href} className={`rail-link${active ? " is-active" : ""}`} title={n.label} aria-label={n.label}>
                <span className="rail-icon">{I(n.icon)}</span>
                <span className="rail-label">{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="rail-foot">
          <button onClick={logout} className="rail-out" title="Sign out" aria-label="Sign out">
            <span className="rail-icon">{I("M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9")}</span>
            <span className="rail-label">Sign out</span>
          </button>
        </div>
      </aside>

      <main className="shell-main">
        <div className="shell-inner">{children}</div>
      </main>
    </div>
  );
}
