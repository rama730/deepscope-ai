import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { verifyCSRFToken, getCSRFTokenFromHeader } from "@/lib/csrf";
import { logger } from "@/lib/logger";
import { getClientIp, getUserAgent } from "@/lib/auth/validation";
import { validateRequestBodySize } from "@/lib/api/validation";
import { errorResponse, csrfErrorResponse } from "@/lib/api/response";
import crypto from "crypto";

/**
 * @route POST /api/auth/record-login
 * @description API endpoint to record login attempts for security tracking
 * @requiresAuth false
 * @requestBody { userId?: string, ipAddress?: string, userAgent?: string, success: boolean, failureReason?: string }
 * @returns {Object} Login record ID and suspicious flag
 * @throws {400} Missing required parameters
 * @throws {403} Invalid CSRF token
 * @throws {500} Server error
 */

function buildLocationDisplay(city: string | null, region: string | null, country: string | null) {
  const parts = [city, region, country].map((p) => (p || "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function headerValue(request: NextRequest, name: string): string | null {
  const v = request.headers.get(name);
  if (!v) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function inferLocationFromRequest(request: NextRequest): {
  city: string | null;
  region: string | null;
  country: string | null;
  display: string | null;
} {
  const geo = (request as any).geo as
    | undefined
    | {
        city?: string;
        region?: string;
        country?: string;
      };

  const city =
    geo?.city ||
    headerValue(request, "x-vercel-ip-city") ||
    headerValue(request, "x-nf-geo-city") ||
    headerValue(request, "x-geo-city");

  const region =
    geo?.region ||
    headerValue(request, "x-vercel-ip-country-region") ||
    headerValue(request, "x-nf-geo-region") ||
    headerValue(request, "x-geo-region");

  const country =
    geo?.country ||
    headerValue(request, "x-vercel-ip-country") ||
    headerValue(request, "cf-ipcountry") ||
    headerValue(request, "x-nf-geo-country") ||
    headerValue(request, "x-geo-country");

  const display = buildLocationDisplay(city || null, region || null, country || null);
  return { city: city || null, region: region || null, country: country || null, display };
}

export async function POST(request: NextRequest) {
  try {
    // Validate request body size (2KB max)
    const sizeCheck = validateRequestBodySize(request, 2 * 1024);
    if (!sizeCheck.valid) {
      return errorResponse(sizeCheck.error || "Request too large", 400, "REQUEST_TOO_LARGE");
    }

    // Verify CSRF token
    const csrfToken = getCSRFTokenFromHeader(request);
    const isValid = await verifyCSRFToken(csrfToken);
    
    if (!isValid) {
      return csrfErrorResponse();
    }

    const { userId, ipAddress, userAgent, success, failureReason } = await request.json() as {
      userId?: string;
      ipAddress?: string;
      userAgent?: string;
      success?: boolean;
      failureReason?: string;
    };

    // userId is required for successful logins, optional for failed (since we don't have it)
    if (success === undefined) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // For successful logins, userId is required
    if (success && !userId) {
      return NextResponse.json(
        { error: "User ID required for successful login" },
        { status: 400 }
      );
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    // Only record if we have a userId (successful login or failed login with known user)
    if (userId) {
      const ip = ipAddress || getClientIp(request);
      const ua = userAgent || getUserAgent(request);
      const inferred = inferLocationFromRequest(request);

      const deviceHash = crypto.createHash("sha256").update(ua || "unknown").digest("hex").slice(0, 32);

      // Basic suspicious heuristic: new IP compared to last login
      let suspicious = false;
      try {
        const { data: last } = await supabase
          .from("login_history")
          .select("ip_address, created_at")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (last?.ip_address && ip && last.ip_address !== ip) suspicious = true;
      } catch { }

      // Insert login history
      const { data: inserted, error: insertErr } = await supabase
        .from("login_history")
        .insert({
          user_id: userId,
          ip_address: ip,
          user_agent: ua,
          location: inferred.display,
          suspicious,
          success,
          failure_reason: success ? null : (failureReason || null),
        })
        .select("id, suspicious")
        .single();

      if (insertErr) {
        logger.error("Record login error", { error: insertErr.message });
        return NextResponse.json({ error: "Failed to record login" }, { status: 500 });
      }

      // Upsert "active session" for this device
      try {
        await supabase
          .from("user_sessions")
          .upsert(
            {
              user_id: userId,
              device_hash: deviceHash,
              device_info: { userAgent: ua },
              ip_address: ip,
              last_active: new Date().toISOString(),
            },
            { onConflict: "user_id,device_hash" }
          );
      } catch (e) {
        logger.warn("Failed to upsert user session", { error: (e as any)?.message });
      }

      // Best-effort: backfill normalized profile location if missing (supports better recs)
      // Only do this when we have some location signal.
      if (inferred.display) {
        try {
          await supabase
            .from("profiles")
            .update({
              location: inferred.display,
              location_city: inferred.city,
              location_region: inferred.region,
              location_country: inferred.country,
              location_source: "ip_geo",
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId)
            .is("location_source", null);
        } catch { }
      }

      return NextResponse.json({
        loginId: inserted?.id,
        suspicious: inserted?.suspicious || false,
      });
    }

    // For failed logins without userId, just return success (rate limiting handled elsewhere)
    return NextResponse.json({
      loginId: null,
      suspicious: false,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    logger.error("Record login API error", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

