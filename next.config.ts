import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stagehand + Playwright are Node-only — don't bundle them through Webpack
  serverExternalPackages: [
    "@browserbasehq/stagehand",
    "@browserbasehq/sdk",
    "playwright",
    "playwright-core",
  ],
};

export default nextConfig;
