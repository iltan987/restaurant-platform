import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common"

import {
  type ConfirmMediaInput,
  confirmMediaSchema,
  type ReorderInput,
  reorderSchema,
  type RequestUploadInput,
  requestUploadSchema,
} from "@repo/schemas"

import { RequirePermission } from "../auth/require-permission.decorator"
import { RestaurantAccessGuard } from "../auth/restaurant-access.guard"
import { byMedia, byMenuItem } from "../auth/scope-resolvers"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { MediaService } from "./media.service"

@Controller()
@UseGuards(RestaurantAccessGuard)
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post("menu-items/:id/media/upload-url")
  @RequirePermission("menu:manage", byMenuItem())
  requestUpload(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(requestUploadSchema)) input: RequestUploadInput
  ) {
    return this.media.requestUpload(itemId, input)
  }

  @Post("menu-items/:id/media")
  @RequirePermission("menu:manage", byMenuItem())
  confirm(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(confirmMediaSchema)) input: ConfirmMediaInput
  ) {
    return this.media.confirm(itemId, input)
  }

  @Put("menu-items/:id/media/order")
  @RequirePermission("menu:manage", byMenuItem())
  reorder(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(reorderSchema)) input: ReorderInput
  ) {
    return this.media.reorder(itemId, input.ids)
  }

  @Delete("media/:mid")
  @RequirePermission("menu:manage", byMedia())
  @HttpCode(204)
  remove(@Param("mid") mediaId: string) {
    return this.media.remove(mediaId)
  }
}
