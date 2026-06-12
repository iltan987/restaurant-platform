import type { RestaurantRole } from "./membership"

/**
 * The catalog of restaurant-scoped actions authorization is decided against.
 * This is the single source of truth shared by the API (enforcement) and the
 * dashboard (hiding controls the caller can't use). Roles map to a subset of
 * these; see {@link ROLE_PERMISSIONS}.
 */
export const RESTAURANT_PERMISSIONS = [
  "restaurant:view", // see the restaurant workspace at all
  "restaurant:manage", // status (go-live), onboarding, profile
  "menu:manage", // categories, items, options, media
  "tables:manage", // floors, areas, tables, QR
  "members:manage", // invite/list/change-role/remove team members
] as const

export type RestaurantPermission = (typeof RESTAURANT_PERMISSIONS)[number]

/**
 * Role → allowed actions. OWNER ⊇ MANAGER ⊇ STAFF today, but this is an explicit
 * map (not a rank) so the sets can diverge later without touching call sites.
 */
const ROLE_PERMISSIONS: Record<
  RestaurantRole,
  readonly RestaurantPermission[]
> = {
  OWNER: RESTAURANT_PERMISSIONS,
  MANAGER: ["restaurant:view", "menu:manage", "tables:manage"],
  STAFF: ["restaurant:view"],
}

/** Whether `role` is allowed to perform `action`. */
export function hasPermission(
  role: RestaurantRole,
  action: RestaurantPermission
): boolean {
  return ROLE_PERMISSIONS[role].includes(action)
}

/** The full set of actions a role may perform (e.g. to gate UI). */
export function permissionsFor(
  role: RestaurantRole
): readonly RestaurantPermission[] {
  return ROLE_PERMISSIONS[role]
}
