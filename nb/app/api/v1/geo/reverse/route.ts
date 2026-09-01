import { NextRequest } from "next/server";
import { createApiHandler } from "@/lib/api/handler";
import { requireAuth } from "@/lib/auth/guards";
import { successResponse, validationErrorResponse, errorResponse } from "@/lib/api/response";

export const dynamic = "force-dynamic";

function buildDisplay(city: string | null, region: string | null, country: string | null) {
  const parts = [city, region, country].map((p) => (p || "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : null;
}

async function handler(req: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    body = null;
  }

  const lat = typeof body?.lat === "number" ? body.lat : Number(body?.lat);
  const lng = typeof body?.lng === "number" ? body.lng : Number(body?.lng);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return validationErrorResponse("Invalid lat/lng");
  }

  // Reverse geocode using OpenStreetMap Nominatim.
  // Note: requires outbound network in the deployed environment.
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("zoom", "10");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      // Nominatim requires a valid User-Agent per policy.
      "User-Agent": "nb-app/1.0 (reverse-geocode; contact=admin@localhost)",
      "Accept": "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    return errorResponse("Failed to reverse geocode location", 502, "GEO_REVERSE_FAILED");
  }

  const json = (await res.json()) as any;
  const addr = json?.address || {};

  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.municipality ||
    addr.county ||
    null;
  const region = addr.state || addr.region || null;
  const country = addr.country || null;

  return successResponse({
    source: "device_geo",
    city,
    region,
    country,
    display: buildDisplay(city, region, country),
  });
}

export const POST = createApiHandler(handler);


