import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common"

import { prisma } from "@repo/db"

/**
 * Wraps the @repo/db singleton and exposes model delegates directly so
 * call sites read `this.prisma.restaurant.findMany()` instead of
 * `this.prisma.client.restaurant.findMany()`.
 *
 * Add a delegate here for each new Prisma model as the schema grows.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  readonly restaurant = prisma.restaurant
  readonly floor = prisma.floor
  readonly area = prisma.area
  readonly table = prisma.table
  readonly category = prisma.category
  readonly menuItem = prisma.menuItem
  readonly allergen = prisma.allergen
  readonly tag = prisma.tag
  readonly optionGroup = prisma.optionGroup
  readonly option = prisma.option
  readonly availabilityWindow = prisma.availabilityWindow
  readonly mediaAsset = prisma.mediaAsset
  readonly activity = prisma.activity
  readonly restaurantMember = prisma.restaurantMember
  readonly restaurantInvitation = prisma.restaurantInvitation
  // Dashboard-audience identity table (Better Auth), read/updated by the
  // invitation-acceptance flow to attach memberships and confirm the email.
  readonly dashUser = prisma.dash_user

  /** Interactive transaction — bound so services can group writes atomically. */
  readonly $transaction = prisma.$transaction.bind(prisma)

  async onModuleInit() {
    await prisma.$connect()
  }

  async onModuleDestroy() {
    await prisma.$disconnect()
  }
}
