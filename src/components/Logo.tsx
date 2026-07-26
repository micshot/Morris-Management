import Image from "next/image";

// The actual Morris Management mark, background removed so it sits on any
// surface. `ring` is kept as a prop for call-site compatibility but the real
// artwork is used at every size.
export default function Logo({
  size = 40,
  title = "Morris Management",
}: {
  size?: number;
  color?: string;
  ring?: boolean;
  title?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt={title}
      width={size}
      height={size}
      priority={size > 60}
      style={{ display: "block", flexShrink: 0, width: size, height: size }}
    />
  );
}
