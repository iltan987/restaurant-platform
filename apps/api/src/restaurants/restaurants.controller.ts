import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"

import {
  type CreateRestaurantInput,
  createRestaurantSchema,
  type PaginationQuery,
  paginationQuerySchema,
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

  /** Tenant lookup — used by the dashboard to resolve a subdomain */
  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.restaurants.findBySlug(slug)
  }
}
