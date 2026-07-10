import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  transpilePackages: ["@iweioo/ui", "@iweioo/sdk"],
  images: {
    unoptimized: true
  }
};

export default nextConfig;
