import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Permite subir Excels de socios más grandes desde el panel
  experimental: { serverActions: { bodySizeLimit: "5mb" } },
};

export default nextConfig;
