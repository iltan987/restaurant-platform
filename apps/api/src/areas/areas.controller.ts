import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common"

import {
  type CreateAreaInput,
  createAreaSchema,
  type PaginationQuery,
  paginationQuerySchema,
  type UpdateAreaInput,
  updateAreaSchema,
} from "@repo/schemas"

import { RequirePermission } from "../auth/require-permission.decorator"
import { RestaurantAccessGuard } from "../auth/restaurant-access.guard"
import { byArea, byFloor, bySlug } from "../auth/scope-resolvers"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { AreasService } from "./areas.service"

const AREAS_PAGE_SIZE = 200

@Controller()
@UseGuards(RestaurantAccessGuard)
export class AreasController {
  constructor(private readonly areas: AreasService) {}

  @Get("restaurants/:slug/areas")
  @RequirePermission("restaurant:view", bySlug())
  findAll(
    @Param("slug") slug: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery,
    @Query("floorId") floorId?: string
  ) {
    return this.areas.findAllBySlug(
      slug,
      query.page,
      query.pageSize ?? AREAS_PAGE_SIZE,
      floorId
    )
  }

  @Post("floors/:id/areas")
  @RequirePermission("tables:manage", byFloor())
  create(
    @Param("id") floorId: string,
    @Body(new ZodValidationPipe(createAreaSchema)) input: CreateAreaInput
  ) {
    return this.areas.create(floorId, input)
  }

  @Patch("areas/:id")
  @RequirePermission("tables:manage", byArea())
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateAreaSchema)) input: UpdateAreaInput
  ) {
    return this.areas.update(id, input)
  }

  @Delete("areas/:id")
  @RequirePermission("tables:manage", byArea())
  @HttpCode(204)
  remove(@Param("id") id: string, @Query("cascade") cascade?: string) {
    return this.areas.remove(id, cascade === "true")
  }
}
