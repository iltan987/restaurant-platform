import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common"

import {
  type CreateAllergenInput,
  createAllergenSchema,
  type UpdateAllergenInput,
  updateAllergenSchema,
} from "@repo/schemas"

import { RequirePermission } from "../auth/require-permission.decorator"
import { RestaurantAccessGuard } from "../auth/restaurant-access.guard"
import { byAllergen, byRestaurantId } from "../auth/scope-resolvers"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { AllergensService } from "./allergens.service"

@Controller()
@UseGuards(RestaurantAccessGuard)
export class AllergensController {
  constructor(private readonly allergens: AllergensService) {}

  @Get("restaurants/:id/allergens")
  @RequirePermission("restaurant:view", byRestaurantId())
  findAll(@Param("id") restaurantId: string) {
    return this.allergens.findAllByRestaurant(restaurantId)
  }

  @Post("restaurants/:id/allergens")
  @RequirePermission("menu:manage", byRestaurantId())
  create(
    @Param("id") restaurantId: string,
    @Body(new ZodValidationPipe(createAllergenSchema))
    input: CreateAllergenInput
  ) {
    return this.allergens.create(restaurantId, input)
  }

  @Patch("allergens/:id")
  @RequirePermission("menu:manage", byAllergen())
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateAllergenSchema))
    input: UpdateAllergenInput
  ) {
    return this.allergens.update(id, input)
  }

  @Delete("allergens/:id")
  @RequirePermission("menu:manage", byAllergen())
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.allergens.remove(id)
  }
}
