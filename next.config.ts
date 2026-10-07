import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  outputFileTracingIncludes: {"/api/{analyze-report,public}": ["./node_modules/pdf-parse/dist/**", "./node_modules/.pnpm/@napi-rs+canvas*/node_modules/@napi-rs/**"]},
};

export default nextConfig;
