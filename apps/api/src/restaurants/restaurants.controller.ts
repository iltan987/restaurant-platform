import { Body, Controller, Get, Param, Post } from "@nestjs/common"
import { createRestaurantSchema, type CreateRestaurantInput } from "@repo/schemas"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { RestaurantsService } from "./restaurants.service"

@Controller("restaurants")
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createRestaurantSchema))
    input: CreateRestaurantInput,
  ) {
    return this.restaurants.create(input)
  }

  @Get()
  findAll() {
    return this.restaurants.findAll()
  }

  /** Tenant lookup — used by the dashboard to resolve a subdomain */
  @Get(":slug")
  findBySlug(@Param("slug") slug: string) {
    return this.restaurants.findBySlug(slug)
  }
}
