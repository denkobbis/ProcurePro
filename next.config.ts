import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // A stray package-lock.json in C:\Users\Jesus (unrelated to this project)
  // makes Turbopack infer the workspace root as the whole user profile
  // directory, which is enormously slower to scan/watch. Pin it explicitly.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // No legitimate reason for any page here to be framed by another
          // site -- without this, a malicious site could iframe an
          // authenticated session and clickjack one-click actions (approve a
          // PO, initiate a payment, create a user).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "soft-touch-ws",
  project: "procurepro",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
