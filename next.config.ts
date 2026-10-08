import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  outputFileTracingIncludes: {"/api/{analyze-report,public,documents}": ["./node_modules/pdf-parse/dist/**", "./node_modules/.pnpm/@napi-rs+canvas*/node_modules/@napi-rs/**"]},
};

export default nextConfig;
