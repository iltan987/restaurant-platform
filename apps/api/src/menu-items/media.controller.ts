import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Put,
} from "@nestjs/common"

import {
  type ConfirmMediaInput,
  confirmMediaSchema,
  type ReorderInput,
  reorderSchema,
  type RequestUploadInput,
  requestUploadSchema,
} from "@repo/schemas"

import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { MediaService } from "./media.service"

@Controller()
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post("menu-items/:id/media/upload-url")
  requestUpload(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(requestUploadSchema)) input: RequestUploadInput
  ) {
    return this.media.requestUpload(itemId, input)
  }

  @Post("menu-items/:id/media")
  confirm(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(confirmMediaSchema)) input: ConfirmMediaInput
  ) {
    return this.media.confirm(itemId, input)
  }

  @Put("menu-items/:id/media/order")
  reorder(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(reorderSchema)) input: ReorderInput
  ) {
    return this.media.reorder(itemId, input.ids)
  }

  @Delete("media/:mid")
  @HttpCode(204)
  remove(@Param("mid") mediaId: string) {
    return this.media.remove(mediaId)
  }
}
