import { Injectable, NotFoundException } from "@nestjs/common"
import type { Request } from "express"

import { ErrorCode } from "@repo/schemas"

import { PrismaService } from "../prisma/prisma.service"

/**
 * A function that resolves the canonical `restaurantId` a route operates on.
 * Always derived server-side (path param or a walk up the resource graph) — the
 * client never supplies a trusted scope. See {@link RestaurantAccessGuard}.
 */
export type ScopeResolver = (
  req: Request,
  resolvers: ScopeResolvers
) => Promise<string>

/**
 * Resolves restaurant scope for the resource controllers. Each method takes a
 * leaf entity id (or a restaurant id/slug) and returns the owning restaurantId,
 * throwing the entity's NOT_FOUND when it doesn't exist (so a bad id is a 404).
 */
@Injectable()
export class ScopeResolvers {
  constructor(private readonly prisma: PrismaService) {}

  private nf(code: ErrorCode, message: string): never {
    throw new NotFoundException({ code, message })
  }

  async fromSlug(slug: string): Promise<string> {
    const r = await this.prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true },
    })
    if (!r) this.nf(ErrorCode.RESTAURANT_NOT_FOUND, `Restaurant was not found`)
    return r.id
  }

  async fromRestaurantId(id: string): Promise<string> {
    const r = await this.prisma.restaurant.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!r) this.nf(ErrorCode.RESTAURANT_NOT_FOUND, `Restaurant was not found`)
    return r.id
  }

  async fromFloor(id: string): Promise<string> {
    const f = await this.prisma.floor.findUnique({
      where: { id },
      select: { restaurantId: true },
    })
    if (!f) this.nf(ErrorCode.FLOOR_NOT_FOUND, "Floor was not found")
    return f.restaurantId
  }

  async fromArea(id: string): Promise<string> {
    const a = await this.prisma.area.findUnique({
      where: { id },
      select: { floor: { select: { restaurantId: true } } },
    })
    if (!a) this.nf(ErrorCode.AREA_NOT_FOUND, "Area was not found")
    return a.floor.restaurantId
  }

  async fromTable(id: string): Promise<string> {
    const t = await this.prisma.table.findUnique({
      where: { id },
      select: {
        area: { select: { floor: { select: { restaurantId: true } } } },
      },
    })
    if (!t) this.nf(ErrorCode.TABLE_NOT_FOUND, "Table was not found")
    return t.area.floor.restaurantId
  }

  async fromCategory(id: string): Promise<string> {
    const c = await this.prisma.category.findUnique({
      where: { id },
      select: { restaurantId: true },
    })
    if (!c) this.nf(ErrorCode.CATEGORY_NOT_FOUND, "Category was not found")
    return c.restaurantId
  }

  async fromMenuItem(id: string): Promise<string> {
    const m = await this.prisma.menuItem.findUnique({
      where: { id },
      select: { restaurantId: true },
    })
    if (!m) this.nf(ErrorCode.MENU_ITEM_NOT_FOUND, "Menu item was not found")
    return m.restaurantId
  }

  async fromOptionGroup(id: string): Promise<string> {
    const g = await this.prisma.optionGroup.findUnique({
      where: { id },
      select: { item: { select: { restaurantId: true } } },
    })
    if (!g)
      this.nf(ErrorCode.OPTION_GROUP_NOT_FOUND, "Option group was not found")
    return g.item.restaurantId
  }

  async fromOption(id: string): Promise<string> {
    const o = await this.prisma.option.findUnique({
      where: { id },
      select: {
        group: { select: { item: { select: { restaurantId: true } } } },
      },
    })
    if (!o) this.nf(ErrorCode.OPTION_NOT_FOUND, "Option was not found")
    return o.group.item.restaurantId
  }

  async fromAllergen(id: string): Promise<string> {
    const a = await this.prisma.allergen.findUnique({
      where: { id },
      select: { restaurantId: true },
    })
    if (!a) this.nf(ErrorCode.ALLERGEN_NOT_FOUND, "Allergen was not found")
    return a.restaurantId
  }

  async fromTag(id: string): Promise<string> {
    const t = await this.prisma.tag.findUnique({
      where: { id },
      select: { restaurantId: true },
    })
    if (!t) this.nf(ErrorCode.TAG_NOT_FOUND, "Tag was not found")
    return t.restaurantId
  }

  async fromMedia(id: string): Promise<string> {
    const m = await this.prisma.mediaAsset.findUnique({
      where: { id },
      select: { item: { select: { restaurantId: true } } },
    })
    if (!m) this.nf(ErrorCode.MEDIA_OBJECT_NOT_FOUND, "Media was not found")
    return m.item.restaurantId
  }
}

/* ── Route-facing resolver factories (used in `@RequirePermission`) ──────────
 * Each closes over a path-param name and defers the lookup to the injected
 * ScopeResolvers at request time. */

const param = (req: Request, name: string): string => {
  const value = req.params[name]
  return typeof value === "string" ? value : ""
}

export const bySlug =
  (name = "slug"): ScopeResolver =>
  (req, r) =>
    r.fromSlug(param(req, name))

export const byRestaurantId =
  (name = "id"): ScopeResolver =>
  (req, r) =>
    r.fromRestaurantId(param(req, name))

export const byFloor =
  (name = "id"): ScopeResolver =>
  (req, r) =>
    r.fromFloor(param(req, name))

export const byArea =
  (name = "id"): ScopeResolver =>
  (req, r) =>
    r.fromArea(param(req, name))

export const byTable =
  (name = "id"): ScopeResolver =>
  (req, r) =>
    r.fromTable(param(req, name))

export const byCategory =
  (name = "id"): ScopeResolver =>
  (req, r) =>
    r.fromCategory(param(req, name))

export const byMenuItem =
  (name = "id"): ScopeResolver =>
  (req, r) =>
    r.fromMenuItem(param(req, name))

export const byOptionGroup =
  (name = "gid"): ScopeResolver =>
  (req, r) =>
    r.fromOptionGroup(param(req, name))

export const byOption =
  (name = "oid"): ScopeResolver =>
  (req, r) =>
    r.fromOption(param(req, name))

export const byAllergen =
  (name = "id"): ScopeResolver =>
  (req, r) =>
    r.fromAllergen(param(req, name))

export const byTag =
  (name = "id"): ScopeResolver =>
  (req, r) =>
    r.fromTag(param(req, name))

export const byMedia =
  (name = "mid"): ScopeResolver =>
  (req, r) =>
    r.fromMedia(param(req, name))
