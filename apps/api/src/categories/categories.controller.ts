import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common"

import {
  type CreateCategoryInput,
  createCategorySchema,
  type ReorderInput,
  reorderSchema,
  type UpdateCategoryInput,
  updateCategorySchema,
} from "@repo/schemas"

import { AdminAuthGuard } from "../auth/auth-guard.factory"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { CategoriesService } from "./categories.service"

@Controller()
@UseGuards(AdminAuthGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get("restaurants/:slug/categories")
  findAll(@Param("slug") slug: string) {
    return this.categories.findAllBySlug(slug)
  }

  @Post("restaurants/:id/categories")
  create(
    @Param("id") restaurantId: string,
    @Body(new ZodValidationPipe(createCategorySchema))
    input: CreateCategoryInput
  ) {
    return this.categories.create(restaurantId, input)
  }

  @Put("restaurants/:id/categories/order")
  reorder(
    @Param("id") restaurantId: string,
    @Body(new ZodValidationPipe(reorderSchema)) input: ReorderInput
  ) {
    return this.categories.reorder(restaurantId, input.ids)
  }

  @Patch("categories/:id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateCategorySchema))
    input: UpdateCategoryInput
  ) {
    return this.categories.update(id, input)
  }

  @Delete("categories/:id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.categories.remove(id)
  }
}
