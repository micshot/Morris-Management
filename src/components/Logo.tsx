// Morris Management mark: interlocking MM monogram inside a broken double ring.
// Pure geometry so it stays crisp from 20px (icon rail, favicon) to hero size.
// `ring={false}` drops the rings for very small placements where they'd fill in.

export default function Logo({
  size = 40,
  color = "var(--gold)",
  ring = true,
  title = "Morris Management",
}: {
  size?: number;
  color?: string;
  ring?: boolean;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeLinecap="square"
      strokeLinejoin="miter"
      role="img"
      aria-label={title}
      style={{ display: "block", flexShrink: 0 }}
    >
      <title>{title}</title>

      {ring && (
        <g strokeWidth="2.6">
          {/* Outer ring, split at top and bottom */}
          <path d="M63.1 16.1 A44 44 0 0 1 63.1 103.9" />
          <path d="M56.9 103.9 A44 44 0 0 1 56.9 16.1" />
          {/* Inner ring, same breaks */}
          <path d="M62.7 22.1 A38 38 0 0 1 62.7 97.9" strokeWidth="1.7" />
          <path d="M57.3 97.9 A38 38 0 0 1 57.3 22.1" strokeWidth="1.7" />
        </g>
      )}

      {/* Interlocking MM */}
      <g strokeWidth="3.1">
        <path d="M34 82 V40 L46 54 L58 40 V82" />
        <path d="M62 82 V40 L74 54 L86 40 V82" />
      </g>
      {/* Inner accent stems */}
      <g strokeWidth="1.7">
        <path d="M45 82 V60" />
        <path d="M75 82 V60" />
      </g>
    </svg>
  );
}
