import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // A stray package-lock.json in C:\Users\Jesus (unrelated to this project)
  // makes Turbopack infer the workspace root as the whole user profile
  // directory, which is enormously slower to scan/watch. Pin it explicitly.
  turbopack: {
    root: __dirname,
  },
};

export default withSentryConfig(nextConfig, {
  org: "soft-touch-ws",
  project: "procurepro",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
