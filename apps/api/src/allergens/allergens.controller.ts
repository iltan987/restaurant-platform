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

import { AdminAuthGuard } from "../auth/auth-guard.factory"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { AllergensService } from "./allergens.service"

@Controller()
@UseGuards(AdminAuthGuard)
export class AllergensController {
  constructor(private readonly allergens: AllergensService) {}

  @Get("restaurants/:id/allergens")
  findAll(@Param("id") restaurantId: string) {
    return this.allergens.findAllByRestaurant(restaurantId)
  }

  @Post("restaurants/:id/allergens")
  create(
    @Param("id") restaurantId: string,
    @Body(new ZodValidationPipe(createAllergenSchema))
    input: CreateAllergenInput
  ) {
    return this.allergens.create(restaurantId, input)
  }

  @Patch("allergens/:id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateAllergenSchema))
    input: UpdateAllergenInput
  ) {
    return this.allergens.update(id, input)
  }

  @Delete("allergens/:id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.allergens.remove(id)
  }
}
