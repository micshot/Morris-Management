import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output keeps the Railway image small and fast to boot.
  output: "standalone",
  reactStrictMode: true,
};

export default nextConfig;
