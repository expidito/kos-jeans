import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the owner's technical specification unchanged when starting Next.js.
  agentRules: false,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: '4mb' } },
};

export default nextConfig;
