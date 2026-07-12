import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@iweioo/auth-bff", "@iweioo/sdk", "@iweioo/ui"]
};

export default nextConfig;
