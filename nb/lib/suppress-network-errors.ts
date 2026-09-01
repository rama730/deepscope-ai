/**
 * Suppress expected network errors at the fetch level
 * This intercepts fetch requests to suppress 406, 403, and 400 errors for expected endpoints
 * Note: This doesn't prevent the network request, but helps reduce console noise
 */

if (typeof window !== 'undefined') {
  // Don't intercept fetch - let Supabase handle errors
  // Instead, we'll suppress console errors in suppress-console-errors.ts
  // This file is kept for potential future use but currently relies on console suppression
}

