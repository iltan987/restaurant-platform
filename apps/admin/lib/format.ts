/**
 * Deterministic YYYY-MM-DD slice of an ISO timestamp. Avoids locale/timezone
 * formatting differences between server render and client hydration.
 */
export function isoDate(iso: string): string {
  return iso.slice(0, 10)
}
