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
  type CreateMenuItemInput,
  createMenuItemSchema,
  type ReorderInput,
  reorderSchema,
  type UpdateMenuItemInput,
  updateMenuItemSchema,
} from "@repo/schemas"

import { RequirePermission } from "../auth/require-permission.decorator"
import { RestaurantAccessGuard } from "../auth/restaurant-access.guard"
import { byCategory, byMenuItem } from "../auth/scope-resolvers"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { MenuItemsService } from "./menu-items.service"

@Controller()
@UseGuards(RestaurantAccessGuard)
export class MenuItemsController {
  constructor(private readonly items: MenuItemsService) {}

  @Get("categories/:cid/items")
  @RequirePermission("restaurant:view", byCategory("cid"))
  findAll(@Param("cid") categoryId: string) {
    return this.items.findAllByCategory(categoryId)
  }

  @Post("categories/:cid/items")
  @RequirePermission("menu:manage", byCategory("cid"))
  create(
    @Param("cid") categoryId: string,
    @Body(new ZodValidationPipe(createMenuItemSchema))
    input: CreateMenuItemInput
  ) {
    return this.items.create(categoryId, input)
  }

  @Put("categories/:cid/items/order")
  @RequirePermission("menu:manage", byCategory("cid"))
  reorder(
    @Param("cid") categoryId: string,
    @Body(new ZodValidationPipe(reorderSchema)) input: ReorderInput
  ) {
    return this.items.reorder(categoryId, input.ids)
  }

  @Get("menu-items/:id")
  @RequirePermission("restaurant:view", byMenuItem())
  findOne(@Param("id") id: string) {
    return this.items.findOne(id)
  }

  @Patch("menu-items/:id")
  @RequirePermission("menu:manage", byMenuItem())
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateMenuItemSchema))
    input: UpdateMenuItemInput
  ) {
    return this.items.update(id, input)
  }

  @Delete("menu-items/:id")
  @RequirePermission("menu:manage", byMenuItem())
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.items.remove(id)
  }
}
