import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: "soft-touch-ws",
  project: "procurepro",
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
