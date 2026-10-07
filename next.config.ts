import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  outputFileTracingIncludes: {"/api/analyze-report": ["./node_modules/pdf-parse/dist/**/pdf.worker.mjs"]},
};

export default nextConfig;
