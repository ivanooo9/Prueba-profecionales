import type { NextConfig } from "next";

const PROTECTED_ROUTES = [
  "/admin",
  "/dashboard",
  "/mi-mascota",
  "/blog-admin",
];

const noStoreHeaders = [
  { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
  { key: "Pragma", value: "no-cache" },
  { key: "Expires", value: "0" },
];

const nextConfig: NextConfig = {
  experimental: {
    scrollRestoration: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  async headers() {
    return PROTECTED_ROUTES.map((route) => ({
      source: `${route}/:path*`,
      headers: noStoreHeaders,
    })).concat(
      PROTECTED_ROUTES.map((route) => ({
        source: route,
        headers: noStoreHeaders,
      }))
    );
  },
};

export default nextConfig;
