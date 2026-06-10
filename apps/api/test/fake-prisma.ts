/**
 * Purpose-built in-memory Prisma fake for e2e tests — no real database.
 * Implements only the query shapes the services actually use
 * (Restaurant → Floor → Area → Table). Import `fakePrisma` as the
 * PrismaService override and call `fakePrisma.__reset()` in beforeEach.
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

const restaurants: Restaurant[] = []
const floors: Floor[] = []
const areas: Area[] = []
const tables: Table[] = []
const categories: Category[] = []
const menuItems: MenuItem[] = []
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
  findUnique({ where }: { where: { id?: string; slug?: string } }) {
    return Promise.resolve(
      restaurants.find(
        (r) =>
          (where.id !== undefined && r.id === where.id) ||
          (where.slug !== undefined && r.slug === where.slug)
      ) ?? null
    )
  },
  findMany({ skip, take }: { skip?: number; take?: number } = {}) {
    const sorted = [...restaurants].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    )
    return Promise.resolve(paginate(sorted, skip, take))
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
  }: {
    where?: { categoryId?: string; id?: { in?: string[] } }
    orderBy?: unknown
    select?: unknown
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

export const fakePrisma = {
  restaurant,
  floor,
  area,
  table,
  category,
  menuItem,
  $transaction(cb: (tx: unknown) => unknown) {
    return Promise.resolve(
      cb({ restaurant, floor, area, table, category, menuItem })
    )
  },
  __reset() {
    restaurants.length = 0
    floors.length = 0
    areas.length = 0
    tables.length = 0
    categories.length = 0
    menuItems.length = 0
    seq = 0
    forceP2002 = false
  },
  __forceP2002(value: boolean) {
    forceP2002 = value
  },
  __stores: { restaurants, floors, areas, tables, categories, menuItems },
}
