import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common"

import {
  type CreateTableInput,
  type CreateTablesBulkInput,
  createTablesBulkSchema,
  createTableSchema,
  type PaginationQuery,
  paginationQuerySchema,
} from "@repo/schemas"

import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { TablesService } from "./tables.service"

const TABLES_PAGE_SIZE = 200

@Controller()
export class TablesController {
  constructor(private readonly tables: TablesService) {}

  @Get("restaurants/:slug/tables")
  findAll(
    @Param("slug") slug: string,
    @Query(new ZodValidationPipe(paginationQuerySchema)) query: PaginationQuery
  ) {
    return this.tables.findAllBySlug(
      slug,
      query.page,
      query.pageSize ?? TABLES_PAGE_SIZE
    )
  }

  @Post("areas/:id/tables")
  create(
    @Param("id") areaId: string,
    @Body(new ZodValidationPipe(createTableSchema)) input: CreateTableInput
  ) {
    return this.tables.create(areaId, input)
  }

  @Post("areas/:id/tables/bulk")
  bulkCreate(
    @Param("id") areaId: string,
    @Body(new ZodValidationPipe(createTablesBulkSchema))
    input: CreateTablesBulkInput
  ) {
    return this.tables.bulkCreate(areaId, input)
  }
}
