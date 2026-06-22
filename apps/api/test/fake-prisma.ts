/**
 * Purpose-built in-memory Prisma fake for e2e tests — no real database.
 * Implements only the query shapes the services actually use.
 * Import `fakePrisma` as the PrismaService override and call
 * `fakePrisma.__reset()` in beforeEach.
 */

type Restaurant = {
  id: string
  name: string
  slug: string
  status: "ACTIVE" | "INACTIVE"
  onboardingStatus: "IN_PROGRESS" | "COMPLETED" | "SKIPPED"
  createdAt: Date
  updatedAt: Date
}
type Floor = {
  id: string
  restaurantId: string
  name: string
  position: number
  createdAt: Date
  updatedAt: Date
}
type Area = {
  id: string
  floorId: string
  name: string
  code: string | null
  position: number
  createdAt: Date
  updatedAt: Date
}
type Table = {
  id: string
  areaId: string
  label: string
  capacity: number | null
  shape: "SQUARE" | "RECT" | "ROUND"
  positionX: number | null
  positionY: number | null
  createdAt: Date
  updatedAt: Date
}

type Category = {
  id: string
  restaurantId: string
  name: string
  position: number
  isHidden: boolean
  createdAt: Date
  updatedAt: Date
}
type MenuItem = {
  id: string
  restaurantId: string
  categoryId: string
  name: string
  priceMinor: number
  inStock: boolean
  position: number
  createdAt: Date
  updatedAt: Date
}

type Allergen = {
  id: string
  restaurantId: string
  label: string
  isStandard: boolean
  createdAt: Date
  updatedAt: Date
}
type Tag = {
  id: string
  restaurantId: string
  label: string
  color: string | null
  createdAt: Date
  updatedAt: Date
}

const restaurants: Restaurant[] = []
const floors: Floor[] = []
const areas: Area[] = []
const tables: Table[] = []
const categories: Category[] = []
const menuItems: MenuItem[] = []
const allergens: Allergen[] = []
const tags: Tag[] = []
let seq = 0
// Simulates a unique-constraint race (P2002) on the next restaurant insert —
// the only path that surfaces SLUG_TAKEN (the service pre-uniquifies otherwise).
let forceP2002 = false
// cuid2-shaped ids (lowercase alphanumeric, no hyphen) so body fields validated
// with z.cuid2() — e.g. areaId on PATCH /tables/:id — pass through the pipe.
const id = (p: string) => `${p}${++seq}`
const now = () => new Date()

const restaurantIdOfFloor = (floorId: string) =>
  floors.find((f) => f.id === floorId)?.restaurantId
const restaurantIdOfArea = (areaId: string) => {
  const area = areas.find((a) => a.id === areaId)
  return area ? restaurantIdOfFloor(area.floorId) : undefined
}
const restaurantIdOfTable = (t: Table) => restaurantIdOfArea(t.areaId)

const paginate = <T>(rows: T[], skip = 0, take = 200) =>
  rows.slice(skip, skip + take)

/**
 * Builds the `COUNTS_INCLUDE` payload the restaurants service selects for the
 * fleet view: flat `_count` (floors/categories/menuItems) plus the nested
 * `floors → areas → _count.tables` the service flattens into area/table counts.
 */
const restaurantCounts = (r: Restaurant) => {
  const restaurantFloors = floors.filter((f) => f.restaurantId === r.id)
  return {
    _count: {
      floors: restaurantFloors.length,
      categories: categories.filter((c) => c.restaurantId === r.id).length,
      menuItems: menuItems.filter((m) => m.restaurantId === r.id).length,
    },
    floors: restaurantFloors.map((f) => ({
      areas: areas
        .filter((a) => a.floorId === f.id)
        .map((a) => ({
          _count: { tables: tables.filter((t) => t.areaId === a.id).length },
        })),
    })),
  }
}

const restaurant = {
  create({ data }: { data: { name: string; slug: string } }) {
    if (forceP2002 || restaurants.some((r) => r.slug === data.slug)) {
      return Promise.reject({ code: "P2002" })
    }
    const row: Restaurant = {
      id: id("rest"),
      name: data.name,
      slug: data.slug,
      status: "INACTIVE",
      onboardingStatus: "IN_PROGRESS",
      createdAt: now(),
      updatedAt: now(),
    }
    restaurants.push(row)
    return Promise.resolve(row)
  },
  findUnique({
    where,
    include,
  }: {
    where: { id?: string; slug?: string }
    include?: {
      categories?: { where?: { isHidden?: boolean } }
      _count?: unknown
      floors?: unknown
    }
  }) {
    const row =
      restaurants.find(
        (r) =>
          (where.id !== undefined && r.id === where.id) ||
          (where.slug !== undefined && r.slug === where.slug)
      ) ?? null
    if (!row) return Promise.resolve(null)
    // Fleet-view counts include (findBySlug / findAll).
    if (include?._count || include?.floors) {
      return Promise.resolve({ ...row, ...restaurantCounts(row) })
    }
    if (!include?.categories) return Promise.resolve(row)

    // Public menu tree: categories (optionally non-hidden) → items, each with
    // the relation arrays the MenuService composes over. The fake has no
    // option/allergen/tag/window/media stores, so those come back empty.
    const onlyVisible = include.categories.where?.isHidden === false
    const cats = categories
      .filter((c) => c.restaurantId === row.id && (!onlyVisible || !c.isHidden))
      .sort((a, b) => a.position - b.position)
      .map((c) => ({
        ...c,
        items: menuItems
          .filter((m) => m.categoryId === c.id)
          .sort((a, b) => a.position - b.position)
          .map((m) => ({
            ...m,
            description: null,
            calories: null,
            servingAmount: null,
            servingUnit: null,
            optionGroups: [],
            allergens: [],
            tags: [],
            availabilityWindows: [],
            media: [],
          })),
      }))
    return Promise.resolve({ ...row, categories: cats })
  },
  findMany({
    skip,
    take,
    include,
  }: {
    skip?: number
    take?: number
    include?: { _count?: unknown; floors?: unknown }
  } = {}) {
    const sorted = [...restaurants].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
    const rows = paginate(sorted, skip, take)
    if (!include?._count && !include?.floors) return Promise.resolve(rows)
    return Promise.resolve(rows.map((r) => ({ ...r, ...restaurantCounts(r) })))
  },
  count() {
    return Promise.resolve(restaurants.length)
  },
  update({
    where,
    data,
  }: {
    where: { id: string }
    data: Partial<Restaurant>
  }) {
    const row = restaurants.find((r) => r.id === where.id)!
    Object.assign(row, data, { updatedAt: now() })
    return Promise.resolve(row)
  },
  delete({ where }: { where: { id: string } }) {
    // DB-level cascade: restaurant → floors → areas → tables, and
    // restaurant → categories → menu items.
    const floorIds = floors
      .filter((f) => f.restaurantId === where.id)
      .map((f) => f.id)
    const areaIds = areas
      .filter((a) => floorIds.includes(a.floorId))
      .map((a) => a.id)
    for (let j = tables.length - 1; j >= 0; j--)
      if (areaIds.includes(tables[j]!.areaId)) tables.splice(j, 1)
    for (let j = areas.length - 1; j >= 0; j--)
      if (floorIds.includes(areas[j]!.floorId)) areas.splice(j, 1)
    for (let j = floors.length - 1; j >= 0; j--)
      if (floors[j]!.restaurantId === where.id) floors.splice(j, 1)
    for (let j = menuItems.length - 1; j >= 0; j--)
      if (menuItems[j]!.restaurantId === where.id) menuItems.splice(j, 1)
    for (let j = categories.length - 1; j >= 0; j--)
      if (categories[j]!.restaurantId === where.id) categories.splice(j, 1)
    for (let j = allergens.length - 1; j >= 0; j--)
      if (allergens[j]!.restaurantId === where.id) allergens.splice(j, 1)
    for (let j = tags.length - 1; j >= 0; j--)
      if (tags[j]!.restaurantId === where.id) tags.splice(j, 1)
    const i = restaurants.findIndex((r) => r.id === where.id)
    const [row] = restaurants.splice(i, 1)
    return Promise.resolve(row)
  },
}

const floor = {
  create({
    data,
  }: {
    data: { restaurantId: string; name: string; position?: number }
  }) {
    if (
      floors.some(
        (f) => f.restaurantId === data.restaurantId && f.name === data.name
      )
    ) {
      return Promise.reject({ code: "P2002" })
    }
    const row: Floor = {
      id: id("floor"),
      restaurantId: data.restaurantId,
      name: data.name,
      position: data.position ?? 0,
      createdAt: now(),
      updatedAt: now(),
    }
    floors.push(row)
    return Promise.resolve(row)
  },
  findUnique({ where }: { where: { id: string } }) {
    return Promise.resolve(floors.find((f) => f.id === where.id) ?? null)
  },
  findMany({
    where,
    skip,
    take,
  }: {
    where: { restaurantId: string }
    skip?: number
    take?: number
  }) {
    const rows = floors
      .filter((f) => f.restaurantId === where.restaurantId)
      .sort((a, b) => a.position - b.position)
    return Promise.resolve(paginate(rows, skip, take))
  },
  count({ where }: { where: { restaurantId: string } }) {
    return Promise.resolve(
      floors.filter((f) => f.restaurantId === where.restaurantId).length
    )
  },
  update({ where, data }: { where: { id: string }; data: Partial<Floor> }) {
    const row = floors.find((f) => f.id === where.id)!
    Object.assign(row, data, { updatedAt: now() })
    return Promise.resolve(row)
  },
  delete({ where }: { where: { id: string } }) {
    const i = floors.findIndex((f) => f.id === where.id)
    const [row] = floors.splice(i, 1)
    // DB-level cascade: floor → areas → tables.
    const childAreas = areas.filter((a) => a.floorId === where.id)
    for (const a of childAreas) {
      const ti = tables.length
      for (let j = ti - 1; j >= 0; j--) {
        if (tables[j]!.areaId === a.id) tables.splice(j, 1)
      }
    }
    for (let k = areas.length - 1; k >= 0; k--) {
      if (areas[k]!.floorId === where.id) areas.splice(k, 1)
    }
    return Promise.resolve(row)
  },
}

const area = {
  create({
    data,
  }: {
    data: {
      floorId: string
      name: string
      code?: string | null
      position?: number
    }
  }) {
    if (areas.some((a) => a.floorId === data.floorId && a.name === data.name)) {
      return Promise.reject({ code: "P2002" })
    }
    const row: Area = {
      id: id("area"),
      floorId: data.floorId,
      name: data.name,
      code: data.code ?? null,
      position: data.position ?? 0,
      createdAt: now(),
      updatedAt: now(),
    }
    areas.push(row)
    return Promise.resolve(row)
  },
  findUnique({
    where,
    include,
  }: {
    where: { id: string }
    include?: { floor?: unknown }
  }) {
    const row = areas.find((a) => a.id === where.id)
    if (!row) return Promise.resolve(null)
    if (include?.floor) {
      return Promise.resolve({
        ...row,
        floor: { restaurantId: restaurantIdOfFloor(row.floorId) },
      })
    }
    return Promise.resolve(row)
  },
  findMany({
    where,
    skip,
    take,
  }: {
    where: { floor?: { restaurantId?: string }; floorId?: string }
    skip?: number
    take?: number
  }) {
    const rid = where.floor?.restaurantId
    const rows = areas
      .filter(
        (a) =>
          (rid === undefined || restaurantIdOfFloor(a.floorId) === rid) &&
          (where.floorId === undefined || a.floorId === where.floorId)
      )
      .sort((a, b) => a.position - b.position)
    return Promise.resolve(paginate(rows, skip, take))
  },
  count({
    where,
  }: {
    where: { floorId?: string; floor?: { restaurantId?: string } }
  }) {
    const rid = where.floor?.restaurantId
    return Promise.resolve(
      areas.filter(
        (a) =>
          (where.floorId === undefined || a.floorId === where.floorId) &&
          (rid === undefined || restaurantIdOfFloor(a.floorId) === rid)
      ).length
    )
  },
  update({ where, data }: { where: { id: string }; data: Partial<Area> }) {
    const row = areas.find((a) => a.id === where.id)!
    Object.assign(row, data, { updatedAt: now() })
    return Promise.resolve(row)
  },
  delete({ where }: { where: { id: string } }) {
    const i = areas.findIndex((a) => a.id === where.id)
    const [row] = areas.splice(i, 1)
    // DB-level cascade: area → tables.
    for (let j = tables.length - 1; j >= 0; j--) {
      if (tables[j]!.areaId === where.id) tables.splice(j, 1)
    }
    return Promise.resolve(row)
  },
}

const table = {
  create({
    data,
  }: {
    data: {
      areaId: string
      label: string
      capacity?: number | null
      shape?: "SQUARE" | "RECT" | "ROUND"
    }
  }) {
    const row: Table = {
      id: id("table"),
      areaId: data.areaId,
      label: data.label,
      capacity: data.capacity ?? null,
      shape: data.shape ?? "SQUARE",
      positionX: null,
      positionY: null,
      createdAt: now(),
      updatedAt: now(),
    }
    tables.push(row)
    return Promise.resolve(row)
  },
  findUnique({
    where,
    include,
  }: {
    where: { id: string }
    include?: { area?: unknown }
  }) {
    const row = tables.find((t) => t.id === where.id)
    if (!row) return Promise.resolve(null)
    if (include?.area) {
      return Promise.resolve({
        ...row,
        area: { floorId: areas.find((a) => a.id === row.areaId)?.floorId },
      })
    }
    return Promise.resolve(row)
  },
  update({ where, data }: { where: { id: string }; data: Partial<Table> }) {
    const row = tables.find((t) => t.id === where.id)!
    Object.assign(row, data, { updatedAt: now() })
    return Promise.resolve(row)
  },
  delete({ where }: { where: { id: string } }) {
    const i = tables.findIndex((t) => t.id === where.id)
    const [row] = tables.splice(i, 1)
    return Promise.resolve(row)
  },
  findFirst({
    where,
  }: {
    where: {
      label?: { in?: string[] }
      area?: { floorId?: string; floor?: { restaurantId?: string } }
      id?: string | { not?: string }
    }
  }) {
    const labels = where.label?.in
    const floorId = where.area?.floorId
    const restaurantId = where.area?.floor?.restaurantId
    const idEq = typeof where.id === "string" ? where.id : undefined
    const notId = typeof where.id === "object" ? where.id.not : undefined
    const floorIdOfTable = (t: Table) =>
      areas.find((a) => a.id === t.areaId)?.floorId
    return Promise.resolve(
      tables.find(
        (t) =>
          (labels === undefined || labels.includes(t.label)) &&
          (floorId === undefined || floorIdOfTable(t) === floorId) &&
          (restaurantId === undefined ||
            restaurantIdOfTable(t) === restaurantId) &&
          (idEq === undefined || t.id === idEq) &&
          (notId === undefined || t.id !== notId)
      ) ?? null
    )
  },
  findMany({
    where,
    skip,
    take,
  }: {
    where: {
      id?: { in?: string[] }
      area?: { floorId?: string; floor?: { restaurantId?: string } }
    }
    skip?: number
    take?: number
  }) {
    const rid = where.area?.floor?.restaurantId
    const floorId = where.area?.floorId
    const idIn = where.id?.in
    const floorIdOf = (t: Table) =>
      areas.find((a) => a.id === t.areaId)?.floorId
    const rows = tables
      .filter(
        (t) =>
          (rid === undefined || restaurantIdOfTable(t) === rid) &&
          (floorId === undefined || floorIdOf(t) === floorId) &&
          (idIn === undefined || idIn.includes(t.id))
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    return Promise.resolve(paginate(rows, skip, take))
  },
  count({
    where,
  }: {
    where: { areaId?: string; area?: { floor?: { restaurantId?: string } } }
  }) {
    const rid = where.area?.floor?.restaurantId
    return Promise.resolve(
      tables.filter(
        (t) =>
          (where.areaId === undefined || t.areaId === where.areaId) &&
          (rid === undefined || restaurantIdOfTable(t) === rid)
      ).length
    )
  },
}

const category = {
  create({
    data,
  }: {
    data: { restaurantId: string; name: string; position?: number }
  }) {
    if (
      categories.some(
        (c) => c.restaurantId === data.restaurantId && c.name === data.name
      )
    ) {
      return Promise.reject({ code: "P2002" })
    }
    const row: Category = {
      id: id("cat"),
      restaurantId: data.restaurantId,
      name: data.name,
      position: data.position ?? 0,
      isHidden: false,
      createdAt: now(),
      updatedAt: now(),
    }
    categories.push(row)
    return Promise.resolve(row)
  },
  findUnique({ where }: { where: { id: string } }) {
    return Promise.resolve(categories.find((c) => c.id === where.id) ?? null)
  },
  findMany({
    where,
  }: {
    where?: { restaurantId?: string; id?: { in?: string[] } }
    orderBy?: unknown
    select?: unknown
  } = {}) {
    const rid = where?.restaurantId
    const idIn = where?.id?.in
    const rows = categories
      .filter(
        (c) =>
          (rid === undefined || c.restaurantId === rid) &&
          (idIn === undefined || idIn.includes(c.id))
      )
      .sort((a, b) => a.position - b.position)
    return Promise.resolve(rows)
  },
  count({ where }: { where: { restaurantId: string } }) {
    return Promise.resolve(
      categories.filter((c) => c.restaurantId === where.restaurantId).length
    )
  },
  update({ where, data }: { where: { id: string }; data: Partial<Category> }) {
    const row = categories.find((c) => c.id === where.id)!
    Object.assign(row, data, { updatedAt: now() })
    return Promise.resolve(row)
  },
  delete({ where }: { where: { id: string } }) {
    const i = categories.findIndex((c) => c.id === where.id)
    const [row] = categories.splice(i, 1)
    return Promise.resolve(row)
  },
}

const menuItem = {
  create({
    data,
  }: {
    data: {
      restaurantId: string
      categoryId: string
      name: string
      priceMinor: number
      inStock?: boolean
      position?: number
    }
  }) {
    const row: MenuItem = {
      id: id("item"),
      restaurantId: data.restaurantId,
      categoryId: data.categoryId,
      name: data.name,
      priceMinor: data.priceMinor,
      inStock: data.inStock ?? true,
      position: data.position ?? 0,
      createdAt: now(),
      updatedAt: now(),
    }
    menuItems.push(row)
    return Promise.resolve(row)
  },
  findUnique({ where }: { where: { id: string } }) {
    return Promise.resolve(menuItems.find((m) => m.id === where.id) ?? null)
  },
  findMany({
    where,
    include,
  }: {
    where?: { categoryId?: string; id?: { in?: string[] } }
    orderBy?: unknown
    select?: unknown
    include?: { media?: unknown; tags?: unknown }
  } = {}) {
    const cid = where?.categoryId
    const idIn = where?.id?.in
    const rows = menuItems
      .filter(
        (m) =>
          (cid === undefined || m.categoryId === cid) &&
          (idIn === undefined || idIn.includes(m.id))
      )
      .sort((a, b) => a.position - b.position)
    if (include?.media || include?.tags) {
      return Promise.resolve(
        rows.map((m) => ({
          ...m,
          ...(include.media ? { media: [] } : {}),
          ...(include.tags ? { tags: [] } : {}),
        }))
      )
    }
    return Promise.resolve(rows)
  },
  count({ where }: { where: { categoryId: string } }) {
    return Promise.resolve(
      menuItems.filter((m) => m.categoryId === where.categoryId).length
    )
  },
  update({ where, data }: { where: { id: string }; data: Partial<MenuItem> }) {
    const row = menuItems.find((m) => m.id === where.id)!
    Object.assign(row, data, { updatedAt: now() })
    return Promise.resolve(row)
  },
  delete({ where }: { where: { id: string } }) {
    const i = menuItems.findIndex((m) => m.id === where.id)
    const [row] = menuItems.splice(i, 1)
    return Promise.resolve(row)
  },
}

const allergen = {
  create({
    data,
  }: {
    data: { restaurantId: string; label: string; isStandard?: boolean }
  }) {
    if (
      allergens.some(
        (a) => a.restaurantId === data.restaurantId && a.label === data.label
      )
    ) {
      return Promise.reject({ code: "P2002" })
    }
    const row: Allergen = {
      id: id("alg"),
      restaurantId: data.restaurantId,
      label: data.label,
      isStandard: data.isStandard ?? false,
      createdAt: now(),
      updatedAt: now(),
    }
    allergens.push(row)
    return Promise.resolve(row)
  },
  createMany({
    data,
  }: {
    data: { restaurantId: string; label: string; isStandard?: boolean }[]
  }) {
    for (const d of data) {
      allergens.push({
        id: id("alg"),
        restaurantId: d.restaurantId,
        label: d.label,
        isStandard: d.isStandard ?? false,
        createdAt: now(),
        updatedAt: now(),
      })
    }
    return Promise.resolve({ count: data.length })
  },
  findUnique({ where }: { where: { id: string } }) {
    return Promise.resolve(allergens.find((a) => a.id === where.id) ?? null)
  },
  findMany({ where }: { where?: { restaurantId?: string } } = {}) {
    const rid = where?.restaurantId
    return Promise.resolve(
      allergens.filter((a) => rid === undefined || a.restaurantId === rid)
    )
  },
  update({ where, data }: { where: { id: string }; data: Partial<Allergen> }) {
    const row = allergens.find((a) => a.id === where.id)!
    Object.assign(row, data, { updatedAt: now() })
    return Promise.resolve(row)
  },
  delete({ where }: { where: { id: string } }) {
    const i = allergens.findIndex((a) => a.id === where.id)
    const [row] = allergens.splice(i, 1)
    return Promise.resolve(row)
  },
}

const tag = {
  create({
    data,
  }: {
    data: { restaurantId: string; label: string; color?: string | null }
  }) {
    if (
      tags.some(
        (t) => t.restaurantId === data.restaurantId && t.label === data.label
      )
    ) {
      return Promise.reject({ code: "P2002" })
    }
    const row: Tag = {
      id: id("tag"),
      restaurantId: data.restaurantId,
      label: data.label,
      color: data.color ?? null,
      createdAt: now(),
      updatedAt: now(),
    }
    tags.push(row)
    return Promise.resolve(row)
  },
  findUnique({ where }: { where: { id: string } }) {
    return Promise.resolve(tags.find((t) => t.id === where.id) ?? null)
  },
  findMany({ where }: { where?: { restaurantId?: string } } = {}) {
    const rid = where?.restaurantId
    return Promise.resolve(
      tags.filter((t) => rid === undefined || t.restaurantId === rid)
    )
  },
  update({ where, data }: { where: { id: string }; data: Partial<Tag> }) {
    const row = tags.find((t) => t.id === where.id)!
    Object.assign(row, data, { updatedAt: now() })
    return Promise.resolve(row)
  },
  delete({ where }: { where: { id: string } }) {
    const i = tags.findIndex((t) => t.id === where.id)
    const [row] = tags.splice(i, 1)
    return Promise.resolve(row)
  },
}

type RestaurantMember = {
  restaurantId: string
  userId: string
  role: "OWNER" | "MANAGER" | "STAFF"
  suspended: boolean
  createdAt: Date
  updatedAt: Date
}

const restaurantMembers: RestaurantMember[] = []

const restaurantMember = {
  findMany({
    where,
  }: {
    where?: { userId?: string; restaurantId?: string; role?: string }
    orderBy?: unknown
    include?: unknown
  } = {}) {
    const rows = restaurantMembers.filter(
      (m) =>
        (where?.userId === undefined || m.userId === where.userId) &&
        (where?.restaurantId === undefined ||
          m.restaurantId === where.restaurantId) &&
        (where?.role === undefined || m.role === where.role)
    )
    // Attach the restaurant relation (include: { restaurant }) by looking it up.
    return Promise.resolve(
      rows.map((m) => ({
        ...m,
        restaurant: restaurants.find((r) => r.id === m.restaurantId) ?? null,
      }))
    )
  },
  findUnique({
    where,
  }: {
    where: { restaurantId_userId?: { restaurantId: string; userId: string } }
  }) {
    const cond = where.restaurantId_userId
    if (!cond) return Promise.resolve(null)
    return Promise.resolve(
      restaurantMembers.find(
        (m) => m.restaurantId === cond.restaurantId && m.userId === cond.userId
      ) ?? null
    )
  },
  findFirst({ where }: { where: { restaurantId?: string; role?: string } }) {
    return Promise.resolve(
      restaurantMembers.find(
        (m) =>
          (where.restaurantId === undefined ||
            m.restaurantId === where.restaurantId) &&
          (where.role === undefined || m.role === where.role)
      ) ?? null
    )
  },
  count({ where }: { where: { restaurantId?: string; role?: string } }) {
    return Promise.resolve(
      restaurantMembers.filter(
        (m) =>
          (where.restaurantId === undefined ||
            m.restaurantId === where.restaurantId) &&
          (where.role === undefined || m.role === where.role)
      ).length
    )
  },
  create({ data }: { data: Partial<RestaurantMember> }) {
    const row: RestaurantMember = {
      restaurantId: data.restaurantId!,
      userId: data.userId!,
      role: data.role ?? "OWNER",
      suspended: data.suspended ?? false,
      createdAt: now(),
      updatedAt: now(),
    }
    restaurantMembers.push(row)
    return Promise.resolve(row)
  },
  update({
    where,
    data,
  }: {
    where: { restaurantId_userId: { restaurantId: string; userId: string } }
    data: Partial<RestaurantMember>
  }) {
    const row = restaurantMembers.find(
      (m) =>
        m.restaurantId === where.restaurantId_userId.restaurantId &&
        m.userId === where.restaurantId_userId.userId
    )!
    Object.assign(row, data, { updatedAt: now() })
    return Promise.resolve(row)
  },
  delete({
    where,
  }: {
    where:
      | { id: string }
      | { restaurantId_userId: { restaurantId: string; userId: string } }
  }) {
    let i: number
    if ("restaurantId_userId" in where) {
      i = restaurantMembers.findIndex(
        (m) =>
          m.restaurantId === where.restaurantId_userId.restaurantId &&
          m.userId === where.restaurantId_userId.userId
      )
    } else {
      i = -1 // id-based delete not used in tests
    }
    const [row] = i >= 0 ? restaurantMembers.splice(i, 1) : [null]
    return Promise.resolve(row)
  },
}

export const fakePrisma = {
  restaurant,
  floor,
  area,
  table,
  category,
  menuItem,
  allergen,
  tag,
  restaurantMember,
  $transaction(cb: (tx: unknown) => unknown) {
    return Promise.resolve(
      cb({ restaurant, floor, area, table, category, menuItem, allergen, tag })
    )
  },
  __reset() {
    restaurants.length = 0
    floors.length = 0
    areas.length = 0
    tables.length = 0
    categories.length = 0
    menuItems.length = 0
    allergens.length = 0
    tags.length = 0
    restaurantMembers.length = 0
    seq = 0
    forceP2002 = false
  },
  __forceP2002(value: boolean) {
    forceP2002 = value
  },
  __stores: {
    restaurants,
    floors,
    areas,
    tables,
    categories,
    menuItems,
    allergens,
    tags,
    restaurantMembers,
  },
}
