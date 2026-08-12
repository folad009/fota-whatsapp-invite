import { getConvexUrl } from "@/lib/convex-url";

const AUTH_KEY_SUFFIXES = [
  "__convexAuthJWT",
  "__convexAuthRefreshToken",
  "__convexAuthOAuthVerifier",
  "__convexAuthServerStateFetchTime",
] as const;

/** Remove Convex Auth keys from localStorage (dev + prod namespaces). */
export function clearConvexAuthStorage(): void {
  if (typeof window === "undefined") return;

  const namespaces = new Set<string>();
  try {
    namespaces.add(getConvexUrl());
  } catch {
    // Ignore if URL isn't configured in this environment.
  }

  // Also clear keys from common misconfigured namespaces.
  for (const key of Object.keys(localStorage)) {
    if (key.includes("__convexAuth")) {
      const prefix = key.split("__convexAuth")[0];
      if (prefix) namespaces.add(prefix);
    }
  }

  for (const namespace of namespaces) {
    for (const suffix of AUTH_KEY_SUFFIXES) {
      localStorage.removeItem(`${namespace}${suffix}`);
    }
  }
}
