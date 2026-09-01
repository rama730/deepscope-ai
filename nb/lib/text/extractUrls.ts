export function extractUrls(text: string): string[] {
  if (!text) return [];

  const matches = text.match(/https?:\/\/[^\s]+/gi) || [];
  const cleaned = matches
    .map((u) => u.trim())
    // Trim common trailing punctuation from paste/markdown contexts.
    .map((u) => u.replace(/[),.;!?]+$/g, ""))
    .filter(Boolean);

  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of cleaned) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}


