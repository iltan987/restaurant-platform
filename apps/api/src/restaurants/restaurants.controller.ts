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
  type SlugAvailabilityQuery,
  slugAvailabilityQuerySchema,
  type UpdateRestaurantInput,
  updateRestaurantSchema,
} from "@repo/schemas"

import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { RestaurantsService } from "./restaurants.service"

const RESTAURANTS_PAGE_SIZE = 20

@Controller("restaurants")
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

  /** Tenant lookup — used by the dashboard to resolve a subdomain */
  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.restaurants.findBySlug(slug)
  }

  /** Go live / deactivate */
  @Patch(":id/status")
  setStatus(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(restaurantStatusSchema))
    input: RestaurantStatusInput
  ) {
    return this.restaurants.setStatus(id, input)
  }

  /** Finish / skip onboarding */
  @Patch(":id/onboarding")
  setOnboarding(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(onboardingStatusSchema))
    input: OnboardingStatusInput
  ) {
    return this.restaurants.setOnboarding(id, input)
  }

  /** Admin edit name/slug */
  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateRestaurantSchema))
    input: UpdateRestaurantInput
  ) {
    return this.restaurants.update(id, input)
  }

  /** Admin delete (cascades floors → areas → tables) */
  @Delete(":id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.restaurants.remove(id)
  }
}
