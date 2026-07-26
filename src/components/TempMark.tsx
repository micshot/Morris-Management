// Fill-level mark for lead temperature. Reads as "how much of this lead is real":
// solid = HOT, half = WARM, hollow = COLD, dashed = UNSET.
// Doubles as a colorblind-safe cue alongside the coloured pill.

const COLOR: Record<string, string> = {
  HOT: "var(--hot)",
  WARM: "var(--warm)",
  COLD: "var(--cold)",
  UNSET: "var(--muted)",
};

export default function TempMark({ temp, size = 11 }: { temp: string; size?: number }) {
  const t = (temp || "UNSET").toUpperCase();
  const c = COLOR[t] ?? COLOR.UNSET;

  return (
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
}
