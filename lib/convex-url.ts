/**
 * Convex deployment URL for client + middleware.
 * Set via NEXT_PUBLIC_CONVEX_URL, or derived at build time in next.config.ts
 * from CONVEX_DEPLOYMENT (e.g. fiery-roadrunner-823 → https://….convex.cloud).
 */
export function getConvexUrl(): string {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_CONVEX_URL is not set. Add it in Vercel env vars or set CONVEX_DEPLOYMENT for build-time derivation."
    );
  }
  return url.replace(/\/$/, "");
}
