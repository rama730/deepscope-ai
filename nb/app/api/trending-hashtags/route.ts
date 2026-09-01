import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { errorResponse } from "@/lib/api/response";
import { checkRateLimit, getRateLimitIdentifier, RATE_LIMITS } from "@/lib/api/rate-limit";
import { getCacheHeaders } from "@/lib/utils/cache-headers";

/**
 * @route GET /api/trending-hashtags
 * @description API endpoint to get trending hashtags
 * @requiresAuth false
 * @rateLimitCategory trending_hashtags
 * @queryParams hours, limit
 * @returns {Array} Array of trending hashtags
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const hours = parseInt(searchParams.get("hours") || "24", 10);
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  try {
    // Rate limiting (by IP since this is a public endpoint)
    const { identifier, type } = getRateLimitIdentifier(request);
    const rateLimitResult = await checkRateLimit(
      request,
      identifier,
      type,
      'trending_hashtags',
      RATE_LIMITS.TRENDING_HASHTAGS
    );

    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitResult.message || "Rate limit exceeded", code: "RATE_LIMIT_EXCEEDED" },
        { 
          status: 429,
          headers: rateLimitResult.lockedUntil ? {
            "Retry-After": Math.ceil((new Date(rateLimitResult.lockedUntil).getTime() - Date.now()) / 1000).toString()
          } : {}
        }
      );
    }

    const supabase = createSupabaseServerClient(request);
    const { data, error } = await supabase.rpc("get_trending_hashtags", {
      hours_window: isNaN(hours) ? 24 : hours,
      limit_count: isNaN(limit) ? 10 : limit,
    });

    if (error) {
      logger.error("Error fetching trending hashtags", { error: error.message });
      return errorResponse(error.message || "Failed to fetch trending hashtags", 500);
    }

    return NextResponse.json(Array.isArray(data) ? data : [], {
      headers: getCacheHeaders("PUBLIC_DYNAMIC"),
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Server error";
    logger.error("Trending hashtags API error", { error: errorMessage });
    return errorResponse(errorMessage, 500);
  }
}
