export const metadata = { title: "Offline · Morris Management" };

// Shown only when a navigation fails and nothing is cached. Deliberately
// says nothing about leads or listings: no app data is stored offline.
export default function OfflinePage() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100dvh", padding: 24 }}>
      <div className="panel" style={{ maxWidth: 420, padding: 28, textAlign: "center" }}>
        <div style={{ fontSize: 30, marginBottom: 10 }}>📡</div>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>No connection</h1>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
          Morris Management works live. Nothing is stored on this device, so there is
          nothing to show until you are back online.
        </p>
      </div>
    </main>
  );
}
