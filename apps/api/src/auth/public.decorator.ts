import { SetMetadata } from "@nestjs/common"

/** Metadata key marking a route as publicly accessible (no auth guard). */
export const IS_PUBLIC_KEY = "isPublic"

/**
 * Marks a route as public so an audience guard applied at the controller level
 * lets it through — used for the storefront reads (menu/restaurant/table by
 * slug) that diners hit unauthenticated (FR-017).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
