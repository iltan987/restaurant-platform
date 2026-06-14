import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"

import {
  type CreateRestaurantInput,
  createRestaurantSchema,
  type OnboardingStatusInput,
  onboardingStatusSchema,
  type PaginationQuery,
  paginationQuerySchema,
  type RestaurantStatusInput,
  restaurantStatusSchema,
  type SetPlanInput,
  setPlanSchema,
  type SlugAvailabilityQuery,
  slugAvailabilityQuerySchema,
  type UpdateRestaurantInput,
  updateRestaurantSchema,
} from "@repo/schemas"

import { Public } from "../auth/public.decorator"
import { RequirePermission } from "../auth/require-permission.decorator"
import { RestaurantAccessGuard } from "../auth/restaurant-access.guard"
import { byRestaurantId } from "../auth/scope-resolvers"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { RestaurantsService } from "./restaurants.service"

const RESTAURANTS_PAGE_SIZE = 20

// Dual-audience: fleet management (create/list/delete/plan) is admin-only —
// those routes carry no @RequirePermission, so the guard admits admins only.
// An OWNER manages their own restaurant's profile/onboarding/status
// (restaurant:manage). The tenant lookup (`GET /:slug`) is @Public().
@Controller("restaurants")
@UseGuards(RestaurantAccessGuard)
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createRestaurantSchema))
    input: CreateRestaurantInput
  ) {
    return this.restaurants.create(input)
  }

  @Get()
  findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery
  ) {
    return this.restaurants.findAll(
      query.page,
      query.pageSize ?? RESTAURANTS_PAGE_SIZE
    )
  }

  /**
   * Live slug availability for the create flow. Declared above `:slug` so the
   * literal path isn't captured as a tenant lookup.
   */
  @Get("slug-available")
  slugAvailable(
    @Query(new ZodValidationPipe(slugAvailabilityQuerySchema))
    query: SlugAvailabilityQuery
  ) {
    return this.restaurants.isSlugAvailable(query.slug)
  }

  /** Tenant lookup — used by the storefront to resolve a subdomain (public) */
  @Public()
  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.restaurants.findBySlug(slug)
  }

  /** Go live / deactivate — owner or admin. */
  @Patch(":id/status")
  @RequirePermission("restaurant:manage", byRestaurantId())
  setStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(restaurantStatusSchema))
    input: RestaurantStatusInput
  ) {
    return this.restaurants.setStatus(id, input)
  }

  /** Change the billing tier — admin-only (no @RequirePermission). */
  @Patch(":id/plan")
  setPlan(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(setPlanSchema)) input: SetPlanInput
  ) {
    return this.restaurants.setPlan(id, input)
  }

  /** Finish / skip onboarding — owner or admin. */
  @Patch(":id/onboarding")
  @RequirePermission("restaurant:manage", byRestaurantId())
  setOnboarding(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(onboardingStatusSchema))
    input: OnboardingStatusInput
  ) {
    return this.restaurants.setOnboarding(id, input)
  }

  /** Edit name/slug/profile — owner or admin. */
  @Patch(":id")
  @RequirePermission("restaurant:manage", byRestaurantId())
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateRestaurantSchema))
    input: UpdateRestaurantInput
  ) {
    return this.restaurants.update(id, input)
  }

  /** Admin delete (cascades floors → areas → tables) — admin-only. */
  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.restaurants.remove(id)
  }
}
