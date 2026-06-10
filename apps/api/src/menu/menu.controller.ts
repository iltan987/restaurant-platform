import { Controller, Get, Param } from "@nestjs/common"

import { MenuService } from "./menu.service"

/** Public (customer-facing) menu surface — no auth, active-gated by slug. */
@Controller("menu")
export class MenuController {
  constructor(private readonly menu: MenuService) {}

  @Get("by-slug/:slug")
  getBySlug(@Param("slug") slug: string) {
    return this.menu.getBySlug(slug)
  }
}
