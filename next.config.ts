import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
  // Keep the owner's technical specification unchanged when starting Next.js.
  agentRules: false,
  // Prevent optimizer cache bypass of RLS-controlled media, including admin photos.
  images: { localPatterns: [{pathname:'/images/storefront/**',search:''}] },
  // Keep canonical/description in the initial head for every consumer.
  htmlLimitedBots: /.*/,
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
