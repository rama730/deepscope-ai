export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

export function profileHref(input: { id?: string | null; username?: string | null } | string): string {
  if (typeof input === "string") return `/profile/${input}`;
  return `/profile/${input.username || input.id || ""}`;
}

export function projectHref(input: { id?: string | null; slug?: string | null } | string): string {
  if (typeof input === "string") return `/projects/${input}`;
  return `/projects/${input.slug || input.id || ""}`;
}


