import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    loaderFile: "./src/lib/cloudinary-loader.ts",
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  // Tree-shake large barrel packages so only the icons/helpers actually used
  // land in each route's bundle — smaller JS, faster loads.
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  // Strip console.* from production bundles (keep errors/warnings).
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
};

export default nextConfig;
