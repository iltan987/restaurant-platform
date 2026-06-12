import { Controller, Get, UseGuards } from "@nestjs/common"

import { DashboardAuthGuard } from "../auth/auth-guard.factory"
import { CurrentUser } from "../auth/current-user.decorator"
import { MembersService } from "./members.service"

/** Dashboard "self" surface — what the signed-in user belongs to. */
@Controller("me")
@UseGuards(DashboardAuthGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get("restaurants")
  async myRestaurants(@CurrentUser() user: { id: string }) {
    const memberships = await this.members.listMemberships(user.id)
    return { memberships }
  }
}
