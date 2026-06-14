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
  type CreateTagInput,
  createTagSchema,
  type UpdateTagInput,
  updateTagSchema,
} from "@repo/schemas"

import { RequirePermission } from "../auth/require-permission.decorator"
import { RestaurantAccessGuard } from "../auth/restaurant-access.guard"
import { byRestaurantId, byTag } from "../auth/scope-resolvers"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { TagsService } from "./tags.service"

@Controller()
@UseGuards(RestaurantAccessGuard)
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get("restaurants/:id/tags")
  @RequirePermission("restaurant:view", byRestaurantId())
  findAll(@Param("id") restaurantId: string) {
    return this.tags.findAllByRestaurant(restaurantId)
  }

  @Post("restaurants/:id/tags")
  @RequirePermission("menu:manage", byRestaurantId())
  create(
    @Param("id") restaurantId: string,
    @Body(new ZodValidationPipe(createTagSchema)) input: CreateTagInput
  ) {
    return this.tags.create(restaurantId, input)
  }

  @Patch("tags/:id")
  @RequirePermission("menu:manage", byTag())
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTagSchema)) input: UpdateTagInput
  ) {
    return this.tags.update(id, input)
  }

  @Delete("tags/:id")
  @RequirePermission("menu:manage", byTag())
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.tags.remove(id)
  }
}
