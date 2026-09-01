export function buildLocationDisplay(
  city?: string | null,
  region?: string | null,
  country?: string | null
): string {
  const parts = [city, region, country].map((p) => (p || "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : "";
}


