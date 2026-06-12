import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"

import { type PaginationQuery, paginationQuerySchema } from "@repo/schemas"

import { AdminAuthGuard } from "../auth/auth-guard.factory"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { ActivityService } from "./activity.service"

@Controller()
@UseGuards(AdminAuthGuard)
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}

  /** Global activity feed across all restaurants. */
  @Get("activity")
  findAll(
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery
  ) {
    return this.activity.findAll(query.page, query.pageSize)
  }

  /** Activity feed scoped to one restaurant. */
  @Get("restaurants/:slug/activity")
  findByRestaurant(
    @Param("slug") slug: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery
  ) {
    return this.activity.findByRestaurant(slug, query.page, query.pageSize)
  }
}
