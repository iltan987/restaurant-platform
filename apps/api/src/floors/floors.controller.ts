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
  Query,
  UseGuards,
} from "@nestjs/common"

import {
  type CreateFloorInput,
  createFloorSchema,
  type FloorLayoutInput,
  floorLayoutSchema,
  type PaginationQuery,
  paginationQuerySchema,
  type UpdateFloorInput,
  updateFloorSchema,
} from "@repo/schemas"

import { AdminAuthGuard } from "../auth/auth-guard.factory"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { FloorsService } from "./floors.service"

const FLOORS_PAGE_SIZE = 200

@Controller()
@UseGuards(AdminAuthGuard)
export class FloorsController {
  constructor(private readonly floors: FloorsService) {}

  @Get("restaurants/:slug/floors")
  findAll(
    @Param("slug") slug: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery
  ) {
    return this.floors.findAllBySlug(
      slug,
      query.page,
      query.pageSize ?? FLOORS_PAGE_SIZE
    )
  }

  @Post("restaurants/:id/floors")
  create(
    @Param("id") restaurantId: string,
    @Body(new ZodValidationPipe(createFloorSchema)) input: CreateFloorInput
  ) {
    return this.floors.create(restaurantId, input)
  }

  @Patch("floors/:id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateFloorSchema)) input: UpdateFloorInput
  ) {
    return this.floors.update(id, input)
  }

  @Put("floors/:id/layout")
  saveLayout(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(floorLayoutSchema)) input: FloorLayoutInput
  ) {
    return this.floors.saveLayout(id, input)
  }

  @Delete("floors/:id")
  @HttpCode(204)
  remove(@Param("id") id: string, @Query("cascade") cascade?: string) {
    return this.floors.remove(id, cascade === "true")
  }
}
