/** Max length of a DNS label — slugs are used as subdomains */
export const SLUG_MAX = 63

/** Allowed format: lowercase alphanumeric words separated by single hyphens */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/**
 * Converts an arbitrary string to a URL/DNS-safe slug.
 * Output is lowercase alphanumeric with single hyphens, max 63 chars
 * (DNS label limit — slugs are used as subdomains).
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-") // non-alnum runs → single hyphen
    .replace(/^-+|-+$/g, "") // trim leading/trailing hyphens
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "") // re-trim after slice
}
