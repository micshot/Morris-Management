import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <div style={{ borderBottom: "3px solid #A88532", paddingBottom: "1rem", marginBottom: "1rem" }}>
        <h1 style={{ color: "#1B3A2F", fontSize: "2.5rem", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
          MORRIS MANAGEMENT
        </h1>
      </div>
      <p style={{ color: "#24443A", fontSize: "1.1rem", margin: "0 0 1.5rem" }}>
        Find your next home
      </p>
      <Link
        href="/chat"
        style={{ background: "#1B3A2F", color: "#F7F5EF", textDecoration: "none", padding: "12px 26px", borderRadius: 6, fontSize: 16, fontWeight: 600 }}
      >
        Chat with our assistant →
      </Link>
      <Link
        href="/login"
        style={{ marginTop: 28, color: "#6B7A70", textDecoration: "none", fontSize: 13 }}
      >
        Realtor sign in
      </Link>
    </main>
  );
}
