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
      <div
        style={{
          borderBottom: "3px solid #A88532",
          paddingBottom: "1rem",
          marginBottom: "1rem",
        }}
      >
        <h1
          style={{
            color: "#1B3A2F",
            fontSize: "2.5rem",
            fontWeight: 800,
            margin: 0,
            letterSpacing: "-0.01em",
          }}
        >
          MORRIS MANAGEMENT
        </h1>
      </div>
      <p style={{ color: "#24443A", fontSize: "1.1rem", margin: "0 0 0.25rem" }}>
        AI-Native Real Estate Agency Operations Platform
      </p>
      <p style={{ color: "#6B7A70", fontSize: "0.9rem", margin: 0 }}>
        Foundation v0.1 · running
      </p>
    </main>
  );
}
