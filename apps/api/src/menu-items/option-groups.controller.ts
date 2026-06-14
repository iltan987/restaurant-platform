import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common"

import {
  type CreateOptionGroupInput,
  createOptionGroupSchema,
  type CreateOptionInput,
  createOptionSchema,
  type ReorderInput,
  reorderSchema,
  type UpdateOptionGroupInput,
  updateOptionGroupSchema,
  type UpdateOptionInput,
  updateOptionSchema,
} from "@repo/schemas"

import { RequirePermission } from "../auth/require-permission.decorator"
import { RestaurantAccessGuard } from "../auth/restaurant-access.guard"
import { byMenuItem, byOption, byOptionGroup } from "../auth/scope-resolvers"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { OptionGroupsService } from "./option-groups.service"

@Controller()
@UseGuards(RestaurantAccessGuard)
export class OptionGroupsController {
  constructor(private readonly groups: OptionGroupsService) {}

  // ── Groups ──
  @Post("menu-items/:id/option-groups")
  @RequirePermission("menu:manage", byMenuItem())
  createGroup(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(createOptionGroupSchema))
    input: CreateOptionGroupInput
  ) {
    return this.groups.createGroup(itemId, input)
  }

  @Put("menu-items/:id/option-groups/order")
  @RequirePermission("menu:manage", byMenuItem())
  reorderGroups(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(reorderSchema)) input: ReorderInput
  ) {
    return this.groups.reorderGroups(itemId, input.ids)
  }

  @Patch("option-groups/:gid")
  @RequirePermission("menu:manage", byOptionGroup())
  updateGroup(
    @Param("gid") groupId: string,
    @Body(new ZodValidationPipe(updateOptionGroupSchema))
    input: UpdateOptionGroupInput
  ) {
    return this.groups.updateGroup(groupId, input)
  }

  @Delete("option-groups/:gid")
  @RequirePermission("menu:manage", byOptionGroup())
  @HttpCode(204)
  removeGroup(@Param("gid") groupId: string) {
    return this.groups.removeGroup(groupId)
  }

  // ── Options ──
  @Post("option-groups/:gid/options")
  @RequirePermission("menu:manage", byOptionGroup())
  createOption(
    @Param("gid") groupId: string,
    @Body(new ZodValidationPipe(createOptionSchema)) input: CreateOptionInput
  ) {
    return this.groups.createOption(groupId, input)
  }

  @Put("option-groups/:gid/options/order")
  @RequirePermission("menu:manage", byOptionGroup())
  reorderOptions(
    @Param("gid") groupId: string,
    @Body(new ZodValidationPipe(reorderSchema)) input: ReorderInput
  ) {
    return this.groups.reorderOptions(groupId, input.ids)
  }

  @Patch("options/:oid")
  @RequirePermission("menu:manage", byOption())
  updateOption(
    @Param("oid") optionId: string,
    @Body(new ZodValidationPipe(updateOptionSchema)) input: UpdateOptionInput
  ) {
    return this.groups.updateOption(optionId, input)
  }

  @Delete("options/:oid")
  @RequirePermission("menu:manage", byOption())
  @HttpCode(204)
  removeOption(@Param("oid") optionId: string) {
    return this.groups.removeOption(optionId)
  }
}
