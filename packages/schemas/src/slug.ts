/** Max length of a DNS label — slugs are used as subdomains */
export const SLUG_MAX = 63

/** Allowed format: lowercase alphanumeric words separated by single hyphens */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
