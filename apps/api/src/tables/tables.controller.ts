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
  type CreateTableInput,
  type CreateTablesBulkInput,
  createTablesBulkSchema,
  createTableSchema,
  type PaginationQuery,
  paginationQuerySchema,
  type UpdateTableInput,
  updateTableSchema,
} from "@repo/schemas"

import { AdminAuthGuard } from "../auth/auth-guard.factory"
import { Public } from "../auth/public.decorator"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { TablesService } from "./tables.service"

const TABLES_PAGE_SIZE = 200

// Admin-only, except the single-table lookup a diner's QR resolves to (public).
@Controller()
@UseGuards(AdminAuthGuard)
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

  @Public()
  @Get("restaurants/:slug/tables/:tableId")
  findOne(@Param("slug") slug: string, @Param("tableId") tableId: string) {
    return this.tables.findOneBySlug(slug, tableId)
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

  @Patch("tables/:id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateTableSchema)) input: UpdateTableInput
  ) {
    return this.tables.update(id, input)
  }

  @Delete("tables/:id")
  @HttpCode(204)
  remove(@Param("id") id: string) {
    return this.tables.remove(id)
  }
}
