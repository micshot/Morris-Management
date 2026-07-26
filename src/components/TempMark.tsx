// Fill-level mark for lead temperature. Reads as "how much of this lead is real":
// solid = HOT, half = WARM, hollow = COLD, dashed = UNSET.
// Doubles as a colorblind-safe cue alongside the coloured pill.

const COLOR: Record<string, string> = {
  HOT: "var(--hot)",
  WARM: "var(--warm)",
  COLD: "var(--cold)",
  UNSET: "var(--muted)",
};

// `withThermo` stacks a small thermometer glyph above the dot, so the mark reads
// as "temperature" without needing a text pill beside it.
export default function TempMark({
  temp,
  size = 11,
  withThermo = false,
}: {
  temp: string;
  size?: number;
  withThermo?: boolean;
}) {
  const t = (temp || "UNSET").toUpperCase();
  const c = COLOR[t] ?? COLOR.UNSET;

  const dot = (
    <svg
      viewBox="0 0 12 12"
      width={size}
      height={size}
      style={{ flexShrink: 0, display: "block" }}
      role="img"
      aria-label={t.toLowerCase()}
    >
      <title>{t}</title>
      {t === "HOT" && <circle cx="6" cy="6" r="4.5" fill={c} />}
      {t === "WARM" && (
        <>
          <circle cx="6" cy="6" r="4.2" fill="none" stroke={c} strokeWidth="1.6" />
          <path d="M6 1.8a4.2 4.2 0 0 1 0 8.4z" fill={c} />
        </>
      )}
      {t === "COLD" && <circle cx="6" cy="6" r="4.2" fill="none" stroke={c} strokeWidth="1.6" />}
      {t === "UNSET" && (
        <circle cx="6" cy="6" r="4.2" fill="none" stroke={c} strokeWidth="1.5" strokeDasharray="2 2.4" />
      )}
    </svg>
  );

  if (!withThermo) return dot;

  return (
    <span
      style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 2, flexShrink: 0 }}
      title={t}
    >
      <svg viewBox="0 0 24 24" width={size - 1} height={size - 1} fill="none" stroke={c} strokeWidth="2.1" strokeLinecap="round" aria-hidden="true" style={{ opacity: 0.75, display: "block" }}>
        <path d="M14 14.8V4a2 2 0 1 0-4 0v10.8a4 4 0 1 0 4 0z" />
      </svg>
      {dot}
    </span>
  );
}
