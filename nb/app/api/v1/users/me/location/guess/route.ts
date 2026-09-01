import { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/guards";
import { successResponse } from "@/lib/api/response";

export const dynamic = "force-dynamic";

type LocationGuess = {
  source: "ip_geo";
  available: boolean;
  city: string | null;
  region: string | null;
  country: string | null;
  display: string | null;
  reason?: string | null;
};

function buildDisplay(city: string | null, region: string | null, country: string | null) {
  const parts = [city, region, country].map((p) => (p || "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

function readHeader(req: NextRequest, name: string): string | null {
  const v = req.headers.get(name);
  if (!v) return null;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : null;
}

async function handler(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  // Next.js (Vercel/Edge) geo hints (may be undefined locally)
  const geo = (req as any).geo as
    | undefined
    | {
        city?: string;
        region?: string;
        country?: string;
      };

  // Vendor headers (best-effort; varies by host/proxy)
  const city =
    geo?.city ||
    readHeader(req, "x-vercel-ip-city") ||
    readHeader(req, "x-nf-geo-city") ||
    readHeader(req, "x-geo-city");

  const region =
    geo?.region ||
    readHeader(req, "x-vercel-ip-country-region") ||
    readHeader(req, "x-nf-geo-region") ||
    readHeader(req, "x-geo-region");

  const country =
    geo?.country ||
    readHeader(req, "x-vercel-ip-country") ||
    readHeader(req, "cf-ipcountry") ||
    readHeader(req, "x-nf-geo-country") ||
    readHeader(req, "x-geo-country");

  const display = buildDisplay(city || null, region || null, country || null);

  const result: LocationGuess = {
    source: "ip_geo",
    available: !!display,
    city: city || null,
    region: region || null,
    country: country || null,
    display,
    reason: display ? null : "Location auto-detection is not available in this environment. Please enter it manually.",
  };

  return successResponse(result);
}

export const GET = createApiHandler(handler);


