import { SetMetadata } from "@nestjs/common"

import type { RestaurantPermission } from "@repo/schemas"

import type { ScopeResolver } from "./scope-resolvers"

/** Metadata key carrying a route's required permission + scope resolver. */
export const REQUIRE_PERMISSION_KEY = "requirePermission"

export type PermissionMeta = {
  action: RestaurantPermission
  resolve: ScopeResolver
}

/**
 * Declares that a route behind {@link RestaurantAccessGuard} requires `action`
 * on the restaurant the route operates on. `resolve` derives that restaurant's
 * id server-side (see the `by*` helpers in `scope-resolvers`). Platform admins
 * bypass this; a route WITHOUT this decorator is therefore admin-only.
 */
export const RequirePermission = (
  action: RestaurantPermission,
  resolve: ScopeResolver
) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, {
    action,
    resolve,
  } satisfies PermissionMeta)
