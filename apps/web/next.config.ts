import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@igho/core", "@igho/providers"],
};

export default nextConfig;
