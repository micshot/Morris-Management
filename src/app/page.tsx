import Link from "next/link";
import Logo from "@/components/Logo";

export default function Home() {
  return (
    <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "calc(2rem + env(safe-area-inset-top, 0px)) 2rem calc(2rem + env(safe-area-inset-bottom, 0px))", textAlign: "center" }}>
      <Logo size={86} />
      <div className="eyebrow" style={{ margin: "18px 0 10px" }}>Real estate, run by intelligence</div>
      <h1 style={{ fontSize: 52, lineHeight: 1.05, letterSpacing: "-.02em", maxWidth: 560 }}>
        Morris <span style={{ color: "var(--gold-soft)" }}>Management</span>
      </h1>
      <p className="muted" style={{ fontSize: 16, margin: "16px 0 30px", maxWidth: 420 }}>
        Talk to our assistant about available properties, or book a 15-minute intro call with an agent.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <Link href="/chat" className="btn btn-gold" style={{ padding: "12px 26px", fontSize: 15 }}>Chat with our assistant →</Link>
      </div>
      <Link href="/login" style={{ marginTop: 34, color: "var(--muted)", fontSize: 13 }}>Realtor sign in</Link>
    </main>
  );
}
