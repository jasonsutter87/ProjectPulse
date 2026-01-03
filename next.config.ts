import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude native modules from server bundle - they'll be loaded at runtime
  // This is needed because better-sqlite3 is a native module that can't be
  // bundled for serverless environments
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
