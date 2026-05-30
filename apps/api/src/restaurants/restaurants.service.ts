import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common"
import { ErrorCode, slugify, type CreateRestaurantInput } from "@repo/schemas"
import { PrismaService } from "../prisma/prisma.service"

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateRestaurantInput) {
    const base = slugify(input.slug ?? input.name)
    if (!base) {
      throw new ConflictException({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Could not derive a slug from the provided name",
      })
    }

    const slug = await this.ensureUniqueSlug(base)

    try {
      return await this.prisma.restaurant.create({
        data: { name: input.name, slug },
      })
    } catch (err: unknown) {
      // P2002 — unique constraint violation (race between check and insert)
      if (isP2002(err)) {
        throw new ConflictException({
          code: ErrorCode.SLUG_TAKEN,
          message: `Slug "${slug}" is already taken`,
        })
      }
      throw err
    }
  }

  async findAll() {
    return this.prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
    })
  }

  async findBySlug(slug: string) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { slug },
    })
    if (!restaurant) {
      throw new NotFoundException({
        code: ErrorCode.RESTAURANT_NOT_FOUND,
        message: `Restaurant with slug "${slug}" was not found`,
      })
    }
    return restaurant
  }

  /** Appends -2, -3, … until a free slug is found. The @unique + P2002 guard is authoritative. */
  private async ensureUniqueSlug(base: string): Promise<string> {
    let candidate = base
    let n = 1
    while (
      await this.prisma.restaurant.findUnique({
        where: { slug: candidate },
      })
    ) {
      n += 1
      candidate = `${base}-${n}`.slice(0, 63).replace(/-+$/g, "")
    }
    return candidate
  }
}

function isP2002(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code: unknown }).code === "P2002"
  )
}
