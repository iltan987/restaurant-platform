import { Global, Module } from "@nestjs/common"

import { MembersModule } from "../members/members.module"
import { RestaurantAccessGuard } from "./restaurant-access.guard"
import { ScopeResolvers } from "./scope-resolvers"

/**
 * Authorization wiring for the dual-audience resource controllers. Global so any
 * controller can `@UseGuards(RestaurantAccessGuard)` without re-importing — the
 * guard's deps (MembersService via MembersModule, ScopeResolvers, PrismaService
 * from the global PrismaModule) resolve here.
 */
@Global()
@Module({
  imports: [MembersModule],
  providers: [ScopeResolvers, RestaurantAccessGuard],
  // Re-export MembersModule so MembersService (the guard's dependency) is
  // globally resolvable: a guard named in `@UseGuards` is instantiated in each
  // host module's context, so every dep it needs must be visible there.
  exports: [ScopeResolvers, RestaurantAccessGuard, MembersModule],
})
export class AuthzModule {}
