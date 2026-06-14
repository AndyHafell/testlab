export function normalizeForCompare(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(s: string): Set<string> {
  return new Set(normalizeForCompare(s).split(" ").filter(Boolean));
}

/** Jaccard similarity over word sets. */
export function similarity(a: string, b: string): number {
  const sa = tokenSet(a);
  const sb = tokenSet(b);
  if (sa.size === 0 && sb.size === 0) return 1;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = sa.size + sb.size - inter;
  return union === 0 ? 0 : inter / union;
}

const THRESHOLD = 0.8;

export function isNearDuplicate(candidate: string, recent: string[]): boolean {
  return recent.some((r) => similarity(candidate, r) >= THRESHOLD);
}
