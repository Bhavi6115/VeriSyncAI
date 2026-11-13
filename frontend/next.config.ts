
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow local development origins
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "169.254.113.180",
  ],

  // Existing configuration — preserved
  cacheComponents: true,
  partialPrefetching: true,

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
