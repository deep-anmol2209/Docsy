import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['scribe.js-ocr', '@scribe.js/canvas'],
};

export default nextConfig;
