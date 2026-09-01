export const CACHE_CONTROL = {
  // Public static assets (images, fonts, etc.) that don't change often
  // Cache for 1 hour, stale for 24 hours
  PUBLIC_STATIC: "public, max-age=3600, stale-while-revalidate=86400",

  // Dynamic public data (feed, trends, etc.)
  // Cache for 1 minute, stale for 5 minutes
  PUBLIC_DYNAMIC: "public, s-maxage=60, stale-while-revalidate=300",

  // User-specific data (profile settings, private lists)
  // Private cache for 5 minutes
  PRIVATE_USER: "private, max-age=300",

  // No cache (for sensitive or real-time data)
  NO_CACHE: "no-store, no-cache, must-revalidate, proxy-revalidate",
} as const;

/**
 * Helper to get cache headers object for Next.js NextResponse
 * @param type key of CACHE_CONTROL
 */
export function getCacheHeaders(type: keyof typeof CACHE_CONTROL) {
  return {
    "Cache-Control": CACHE_CONTROL[type],
  };
}
