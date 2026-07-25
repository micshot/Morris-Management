export const metadata = {
  title: "Morris Management",
  description: "AI-native real estate agency operations platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          background: "#F7F5EF",
          color: "#1A1D1B",
        }}
      >
        {children}
      </body>
    </html>
  );
}
