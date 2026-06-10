import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from "@nestjs/common"

import {
  type CreateTagInput,
  createTagSchema,
  type UpdateTagInput,
  updateTagSchema,
} from "@repo/schemas"

import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { TagsService } from "./tags.service"

@Controller()
export class TagsController {
  constructor(private readonly tags: TagsService) {}

  @Get("restaurants/:id/tags")
  findAll(@Param("id") restaurantId: string) {
    return this.tags.findAllByRestaurant(restaurantId)
  }

  @Post("restaurants/:id/tags")
  create(
    @Param("id") restaurantId: string,
    @Body(new ZodValidationPipe(createTagSchema)) input: CreateTagInput
  ) {
    return this.tags.create(restaurantId, input)
  }

  @Patch("tags/:id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTagSchema)) input: UpdateTagInput
  ) {
    return this.tags.update(id, input)
  }

  @Delete("tags/:id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.tags.remove(id)
  }
}
