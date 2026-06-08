/* Pure formatting / numeric helpers. Deterministic and fully unit-tested. */

/**
 * Parse a possibly-empty / messy numeric string into a finite number.
 * Returns `fallback` (default 0) for anything that isn't a finite number.
 * Strips commas and surrounding whitespace so "1,200,000" works.
 */
export function toNum(value: unknown, fallback = 0): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/,/g, "").trim();
  if (cleaned === "") return fallback;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : fallback;
}

/** Format a number (or numeric string) as a grouped integer string. */
export function fmtMoney(value: unknown): string {
  return toNum(value).toLocaleString("en-US");
}

/** Clamp a number into the inclusive [min, max] range. */
export function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

/** Split a comma/、separated feature string into trimmed, non-empty tokens. */
export function splitFeatures(features: string | undefined | null): string[] {
  if (!features) return [];
  return features
    .split(/[,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
