import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the preview domain to load _next/* resources without cross-origin errors
  allowedDevOrigins: [
    "*.space-z.ai",
    "*.z.ai",
    "localhost",
    "127.0.0.1",
  ],
};

export default nextConfig;
