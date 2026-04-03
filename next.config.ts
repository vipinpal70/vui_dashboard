import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['vui.test', '*.trycloudflare.com'],
};

export default nextConfig;
