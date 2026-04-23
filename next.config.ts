import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@a2ui/ui", "@a2ui/chat", "@a2ui/agent-node"],
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
