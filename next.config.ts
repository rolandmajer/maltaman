import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lean, self-contained build for the Docker/Fly.io deployment (see Dockerfile) —
  // copies only the traced production dependencies into .next/standalone.
  output: "standalone",
};

export default nextConfig;
