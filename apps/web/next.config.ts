import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  transpilePackages: ["@iweioo/ui", "@iweioo/sdk"],
  images: {
    unoptimized: true
  }
};

export default nextConfig;
