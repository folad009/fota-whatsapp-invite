import type { NextConfig } from "next";

function resolveConvexUrl(): string | undefined {
  if (process.env.NEXT_PUBLIC_CONVEX_URL) {
    return process.env.NEXT_PUBLIC_CONVEX_URL.replace(/\/$/, "");
  }

  const deployment = process.env.CONVEX_DEPLOYMENT?.replace(/^(prod|dev):/, "");
  if (deployment) {
    return `https://${deployment}.convex.cloud`;
  }

  return undefined;
}

function resolveConvexSiteUrl(): string | undefined {
  if (process.env.NEXT_PUBLIC_CONVEX_SITE_URL) {
    return process.env.NEXT_PUBLIC_CONVEX_SITE_URL.replace(/\/$/, "");
  }

  const cloudUrl = resolveConvexUrl();
  if (cloudUrl) {
    return cloudUrl.replace(".convex.cloud", ".convex.site");
  }

  return undefined;
}

const convexUrl = resolveConvexUrl();
const convexSiteUrl = resolveConvexSiteUrl();

if (process.env.VERCEL && !convexUrl) {
  throw new Error(
    "Build failed: set NEXT_PUBLIC_CONVEX_URL or CONVEX_DEPLOYMENT in Vercel environment variables."
  );
}

const nextConfig: NextConfig = {
  env: {
    ...(convexUrl ? { NEXT_PUBLIC_CONVEX_URL: convexUrl } : {}),
    ...(convexSiteUrl ? { NEXT_PUBLIC_CONVEX_SITE_URL: convexSiteUrl } : {}),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
